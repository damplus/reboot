import { Stream } from 'xstream'

import {
  ResourceStateLoading,
  ResourceStateLoaded,
  ResourceStateDeleted,
  ResourceStateFailed,
  applyResourceMutation,
} from './resource'

export interface AsyncValueStream<T> extends Stream<AsyncValue<T>> {}
export interface AsyncListStream<T> extends Stream<AsyncValue<T>[]> {}

export abstract class AsyncValue<T> {
  /**
   * Stream operator to get a stream of related resources from a resource
   *
   * (eg: to convert a stream of `employee` resources to a stream of `company`
   * resources by following the `employer` relationship)
   **/
  static getChild<P, C>(fn: (parent: P) => Stream<AsyncValue<C>>): (parent$: Stream<AsyncValue<P>>) => Stream<AsyncValue<C>>
  static getChild<P, C>(fn: (parent: P) => Stream<C>): (parent$: Stream<AsyncValue<P>>) => Stream<AsyncValue<C>>

  static getChild<P, C>(fn: (parent: P) => Stream<C | AsyncValue<C>>) {
    return (parent$: Stream<AsyncValue<P>>): Stream<AsyncValue<C>> => (
      parent$
        .map(parentRes => parentRes.map(fn))
        .compose(AsyncValue.flattenStreamOf)
    )
  }

  /**
   * Eliminates the intermediate async state between two streams, merging with the async state
   * of the inner stream if present
   */
  static flattenStreamOf<T>(stream: Stream<AsyncValue<Stream<T | AsyncValue<T>>>>): Stream<AsyncValue<T>> {
    return stream
      .map(r1 => r1.map(r2$ => r2$.map(AsyncValue.coerceFrom)))
      .map(r1 => r1.getWithDefault(missingVal => Stream.of(missingVal)))
      .flatten()
  }

  static waitFor<T>(s: Stream<AsyncValue<T>>): Stream<T> {
    return s.map(val => val
      .map(x => Stream.of(x))
      .getWithDefault(Stream.empty())
    )
    .flatten()
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

  abstract flatMap<U>(fn: (x: T) => AsyncValue<U>): AsyncValue<U>
  abstract withDefault<U>(defaultVal: U | ((x: MissingAsyncValue) => U)): PresentAyncValue<T | U>
  abstract map<U>(fn: (x: T) => U): AsyncValue<U>

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

  map<U>(fn: (x: T) => U): AsyncValue<U> {
    // [bug]: Mutation is discarded as it may have a different type to value.
    //        Could transform mutation too, although this may have unpredicatable effects

    return new PresentAyncValue({
      status: 'loaded',
      value: fn(this.value),
      reloading: this.loading
    })
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

  map(): MissingAsyncValue {
    return this
  }

  withDefault<T>(defaultVal: T  | ((x: MissingAsyncValue) => T)) {
    const value = (typeof defaultVal === 'function') ? defaultVal(this) : defaultVal
    return new PresentAyncValue({ status: 'loaded', value })
  }
}
