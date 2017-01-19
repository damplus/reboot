import { DataStream } from './stream'
import { find } from 'lodash'

import {
  ResourceStateLoading,
  ResourceStateLoaded,
  ResourceStateDeleted,
  ResourceStateFailed,
  applyResourceMutation,
} from './resource'

export interface AsyncValueStream<T> extends DataStream<AsyncValue<T>> {}

export abstract class AsyncValue<T> {
  static waitFor<T>(s: DataStream<AsyncValue<T>>): DataStream<T> {
    return s.flatMap(val => val.toStream())
  }

  static of<T>(value: T): AsyncValue<T> {
    return new PresentAyncValue({ status: 'loaded', value })
  }

  static loading(): AsyncValue<never> {
    return new MissingAsyncValue({ status: 'loading' })
  }

  static error(error: Error): AsyncValue<never> {
    return new MissingAsyncValue({ status: 'failed', error })
  }

  static all<T>(value: AsyncValue<T>[]): AsyncValue<T[]> {
    if (value.every(x => x instanceof PresentAyncValue)) {
      return new PresentAyncValue({
        status: 'loaded',
        value: value.map(x => x.value!)
      })
    }

    const error = find(value, v => v.error)
    if (error) return new MissingAsyncValue({ status: 'failed', error: error.error! })

    return new MissingAsyncValue({ status: 'loading' })
  }

  abstract get loading(): boolean
  abstract get deleted(): boolean
  abstract get error(): Error | undefined
  abstract get value(): T | undefined
  abstract get optimisticValue(): T | undefined
  abstract get mutationType(): MutationType | undefined

  abstract toStream(): DataStream<T>
  abstract flatMap<U>(fn: (x: T) => AsyncValue<U>): AsyncValue<U>
  abstract withDefault<U>(defaultVal: U | ((x: MissingAsyncValue) => U)): PresentAyncValue<T | U>

  map<U>(fn: (x: T) => U): AsyncValue<U> {
    return this.flatMap(x => new PresentAyncValue({ status: 'loaded', value: fn(x) }))
  }

  getWithDefault<U>(defaultVal: U | ((x: MissingAsyncValue) => U)): T | U {
    return this.withDefault(defaultVal).value
  }
}

export type MutationType = 'updating' | 'deleting'

export class PresentAyncValue<T> extends AsyncValue<T> {
  private state: ResourceStateLoaded<T>

  constructor(state: ResourceStateLoaded<T>) {
    super()
    this.state = state
  }

  get deleted() { return false }
  get loading() { return this.state.reloading || false }
  get error() { return undefined }
  get value() { return this.state.value }
  get optimisticValue() { return applyResourceMutation(this.state.value, this.state.mutation) }

  get mutationType(): MutationType | undefined {
    const { mutation } = this.state

    if (mutation) {
      if (mutation.type === 'delete') {
        return 'deleting'

      } else {
        return 'updating'
      }
    }

    return undefined
  }

  toStream(): DataStream<T> {
    return DataStream.of(this.value)
  }

  flatMap<U>(fn: (x: T) => AsyncValue<U>): AsyncValue<U> {
    return fn(this.state.value)
  }

  withDefault() {
    return this
  }
}

export class MissingAsyncValue extends AsyncValue<never> {
  private state: ResourceStateLoading | ResourceStateDeleted | ResourceStateFailed

  constructor(state: ResourceStateLoading | ResourceStateDeleted | ResourceStateFailed) {
    super()
    this.state = state
  }

  get deleted() { return this.state.status === 'deleted' }
  get loading() { return this.state.status === 'loading' }
  get error() { return (this.state.status === 'failed') && this.state.error || undefined }
  get value() { return undefined }
  get optimisticValue() { return undefined }
  get mutationType() { return undefined }

  flatMap<U>(fn: () => AsyncValue<U>): AsyncValue<U> {
    return this
  }

  toStream(): DataStream<never> {
    if (this.state.status === 'loading' || this.state.status === 'deleted') {
      return DataStream.never()
    }

    return DataStream.error(this.state.error)
  }

  withDefault<T>(defaultVal: T  | ((x: MissingAsyncValue) => T)) {
    const value = (typeof defaultVal === 'function') ? defaultVal(this) : defaultVal
    return new PresentAyncValue({ status: 'loaded', value })
  }
}
