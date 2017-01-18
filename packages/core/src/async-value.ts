import { DataStream } from './stream'

import {
  ResourceStateLoading,
  ResourceStateLoaded,
  ResourceStateDeleted,
  ResourceStateFailed,
  applyResourceMutation,
} from './resource'

export interface AsyncValueStream<T> extends DataStream<AsyncValue<T>> {}
export interface AsyncListStream<T> extends DataStream<AsyncValue<T>[]> {}

export abstract class AsyncValue<T> {
  /**
   * Stream operator to get a stream of related resources from a resource
   *
   * (eg: to convert a stream of `employee` resources to a stream of `company`
   * resources by following the `employer` relationship)
   **/
  static getChild<P, C>(fn: (parent: P) => DataStream<AsyncValue<C>>): (parent$: DataStream<AsyncValue<P>>) => DataStream<AsyncValue<C>>
  static getChild<P, C>(fn: (parent: P) => DataStream<C>): (parent$: DataStream<AsyncValue<P>>) => DataStream<AsyncValue<C>>

  static getChild<P, C>(fn: (parent: P) => DataStream<C | AsyncValue<C>>) {
    return (parent$: DataStream<AsyncValue<P>>): DataStream<AsyncValue<C>> => (
      AsyncValue.flattenStreamOf(parent$.map(parentRes => parentRes.map(fn)))
    )
  }

  /**
   * Eliminates the intermediate async state between two streams, merging with the async state
   * of the inner stream if present
   */
  static flattenStreamOf<T>(stream: DataStream<AsyncValue<DataStream<T | AsyncValue<T>>>>): DataStream<AsyncValue<T>> {
    return stream
      .map(r1 => r1.map(r2$ => r2$.map(AsyncValue.coerceFrom)))
      .flatMap(r1 => r1.getWithDefault(missingVal => DataStream.of(missingVal)))
  }

  static waitFor<T>(s: DataStream<AsyncValue<T>>): DataStream<T> {
    return s.flatMap(val =>val
      .map(x => DataStream.of(x))
      .getWithDefault(DataStream.empty())
    )
  }

  static coerceFrom<T>(value: T | AsyncValue<T>): AsyncValue<T> {
    if (value instanceof AsyncValue) {
      return value

    } else {
      return new PresentAyncValue({ status: 'loaded', value })
    }
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
