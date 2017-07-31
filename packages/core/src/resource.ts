import { merge, fromPairs, zip } from 'lodash'

import { DataStream } from './stream'
import { Store } from './store'
import { AsyncValue, AsyncValueStream, MissingAsyncValue, PresentAyncValue } from './async-value'

export type ResourceMutation<T>
= { type: 'put', value: T }
| { type: 'patch', deltaValue: Partial<T> }
| { type: 'delete' }

export function resourceValue<T>(s?: ResourceState<T>): AsyncValue<T> {
  if (!s) return AsyncValue.loading()

  if (s.status === 'loaded') {
    return new PresentAyncValue(s)

  } else {
    return new MissingAsyncValue(s)
  }
}

export interface ResourceConfig<T> {
  key: string
  store: Store<{}>
  fetch: (x: string) => Promise<T>
  fetchMany?: (x: string[]) => Promise<{ [key: string]: T }>
}

export class Resource<T> {
  private store: Store<{ [key: string]: ResourceStateMap }>
  private key: string
  private fetchImpl: (x: string) => Promise<T>
  private fetchManyImpl?: (x: string[]) => Promise<{ [key: string]: T }>

  constructor(opts: ResourceConfig<T>) {
    this.store = opts.store.addReducer(opts.key, httpResourceReducer(opts.key))
    this.key = opts.key
    this.fetchImpl = opts.fetch
    this.fetchManyImpl = opts.fetchMany
  }

  $(keys: string[]): AsyncValueStream<T[]>
  $(key: string): AsyncValueStream<T>

  $(selector: string[] | string): AsyncValueStream<any> {
    const state$ = this.store.select$(state => state[this.key])

    if (typeof selector === 'string') {
      return state$
        .onSubscribe(() => this.fetch(selector, false))
        .map(s => s[selector])
        .map(resourceValue)

    } else {
      return state$
        .onSubscribe(() => this.fetch(selector, false))
        .map(s => selector.map(key => s[key]))
        .distinguishBy((a, b) => a.every((_, i) => a[i] === b[i]))
        .map(values => AsyncValue.all(values.map(resourceValue)))
    }
  }

  mutate(key: string, mutation: ResourceMutation<T>, effect: () => Promise<any>): void {
    return this.mutateMany({ [key]: mutation }, effect)
  }

  mutateMany(mutations: { [selector: string]: ResourceMutation<T> }, effect: () => Promise<any>): void {
    this.store.dispatch<ResourceAction>({ type: 'http:mutation:start', resourceKey: this.key, payload: mutations })

    Promise.resolve().then(effect).then(
      () => {
        this.store.dispatch<ResourceAction>({ type: 'http:mutation:complete', resourceKey: this.key, payload: mutations })
      },
      (error) => {
        this.store.dispatch<ResourceAction>({ type: 'http:mutation:failed', resourceKey: this.key, keys: Object.keys(mutations), error })
      }
    )
  }

  query<Q>(key: string, queryHandler: (q: Q, update: (values: { [key: string]: T }) => void) => Promise<string[]>): ResourceQuery<Q, T> {
    return new ResourceQuery({
      resource: this,
      key: this.key + ':query:' + key,
      store: this.store,
      queryHandler: (q: Q) => (
        queryHandler(q, payload => {
          this.store.dispatch<ResourceAction>({
            type: 'http:fetch:complete',
            resourceKey: this.key,
            payload
          })
        })
      )
    })
  }

  fetch(key: string | string[], reload: boolean = true): Promise<void> {
    if (typeof key !== 'string') {
      return this.fetchMany(key, reload)
    }

    if (this.hasFetched(key) && !reload) {
      return Promise.resolve()
    }

    this.store.dispatch<ResourceAction>({ type: 'http:fetch:start', resourceKey: this.key, keys: [key] })

    return Promise.resolve(key).then(this.fetchImpl).then(
      (payload) => {
        this.store.dispatch<ResourceAction>({ type: 'http:fetch:complete', resourceKey: this.key, payload: { [key]: payload } })
      },
      (error) => {
        this.store.dispatch<ResourceAction>({ type: 'http:fetch:failed', resourceKey: this.key, keys: [key], error })
      }
    )
  }

  private fetchMany(keys: string[], reload: boolean = true): Promise<void> {
    if (!reload) {
      keys = keys.filter(x => !this.hasFetched(x))
    }

    if (keys.length === 0) {
      return Promise.resolve()
    }

    this.store.dispatch<ResourceAction>({ type: 'http:fetch:start', resourceKey: this.key, keys })
    const fetchImpl = this.fetchManyImpl || this.syntheticFetchMany()

    return Promise.resolve(keys).then(fetchImpl).then(
      (payload) => {
        this.store.dispatch<ResourceAction>({ type: 'http:fetch:complete', resourceKey: this.key, payload })
      },
      (error) => {
        this.store.dispatch<ResourceAction>({ type: 'http:fetch:failed', resourceKey: this.key, keys, error })
      }
    )
  }

  private syntheticFetchMany() {
    return (keys: string[]): Promise<{ [key: string]: T }> =>
      Promise.all(keys.map(this.fetchImpl)).then(results => fromPairs(zip<{}>(keys, results)))
  }

  private hasFetched(id: string) {
    const state = this.state()[id]
    return state && state.status !== 'failed'
  }

  private state() {
    return this.store.getState()[this.key]
  }
}


export interface ResourceQueryProps<Q, T> {
  resource: Resource<T>
  key: string
  store: Store<{}>
  queryHandler: (q: Q) => Promise<string[]>
}

export class ResourceQuery<Q, T> {
  private key: string
  private store: Store<{ [key: string]: ResourceStateMap }>
  private resource: Resource<T>
  private queryHandler: (q: Q) => Promise<string[]>

  constructor(opts: ResourceQueryProps<Q, T>) {
    this.store = opts.store.addReducer(opts.key, httpResourceReducer(opts.key))
    this.key = opts.key
    this.resource = opts.resource
    this.queryHandler = opts.queryHandler
  }

  $(key: string): AsyncValueStream<T[]> {
    return this.store.select$((state): AsyncValueStream<T[]> => {
      const resourceState = this.state()
      const resultState = resourceState[key] as ResourceState<string[]>

      if (resultState && resultState.status === 'loaded') {
        return this.resource.$(resultState.value)

      } else {
        if(resultState) {
            return DataStream.of(new MissingAsyncValue(resultState))
        } else {
          return DataStream.of(new PresentAyncValue({status: 'loaded', value: []}))
        }
      }
    })
    .flatMap(x => x)
  }

  setQuery(key: string, q: Q) {
    this.store.dispatch<ResourceAction>({ type: 'http:fetch:start', resourceKey: this.key, keys: [key] })

    return Promise.resolve(q).then(this.queryHandler).then(
      (payload) => {
        this.store.dispatch<ResourceAction>({ type: 'http:fetch:complete', resourceKey: this.key, payload: { [key]: payload } })
      },
      (error) => {
        this.store.dispatch<ResourceAction>({ type: 'http:fetch:failed', resourceKey: this.key, keys: [key], error })
      }
    )
  }

  private state() {
    return this.store.getState()[this.key]
  }
}

export function applyResourceMutation<T>(value: T, mutation?: ResourceMutation<T>): T {
  if (!mutation) {
    return value
  }

  if (mutation.type === 'delete') {
    return value

  } else if (mutation.type === 'patch') {
    return value && merge({}, value, mutation.deltaValue)

  } else {
    return mutation.value
  }
}


/** State */

export type ResourceAction
= { type: 'http:fetch:start', resourceKey: string, keys: string[] }
| { type: 'http:fetch:complete', resourceKey: string, payload: { [key: string]: {} } }
| { type: 'http:fetch:failed', resourceKey: string, keys: string[], error: Error }
| { type: 'http:mutation:start', resourceKey: string, payload: { [key: string]: ResourceMutation<{}> } }
| { type: 'http:mutation:complete', resourceKey: string, payload: { [key: string]: ResourceMutation<{}> } }
| { type: 'http:mutation:failed', resourceKey: string, keys: string[], error: Error }

export type ResourceStateMap
= { [key: string]: ResourceState<{}> | undefined }

export type ResourceState<T>
= ResourceStateLoading
| ResourceStateLoaded<T>
| ResourceStateFailed
| ResourceStateDeleted

export interface ResourceStateLoading { status: 'loading' }
export interface ResourceStateLoaded<T> { status: 'loaded'; value: T; mutation?: ResourceMutation<T>; reloading?: boolean }
export interface ResourceStateFailed { status: 'failed'; error: Error }
export interface ResourceStateDeleted { status: 'deleted' }

export function httpResourceReducer(key: string) {
  return function reduceHTTPResource(state: ResourceStateMap = {}, action: ResourceAction | { type: '' }): ResourceStateMap {
    if ((action as ResourceAction).resourceKey !== key) {
      return state
    }

    if (action.type === 'http:fetch:start') {
      return action.keys.reduce((state, key): ResourceStateMap => {
        const resource = state[key]

        if (!resource || resource.status !== 'loaded') {
          return {
            ...state,
            [key]: {
              status: 'loading'
            }
          }

        } else {
          return {
            ...state,
            [key]: {
              ...resource,
              reloading: true
            }
          }
        }
      }, state)

    } else if (action.type === 'http:fetch:complete') {
      const { payload } = action

      return Object.keys(payload).reduce((state, key): ResourceStateMap => {
        const value = payload[key]
        const resource = state[key]

        if (!resource || resource.status !== 'loaded') {
          return {
            ...state,
            [key]: {
              status: 'loaded',
              value
            }
          }

        } else {
          return {
            ...state,
            [key]: stripUndefined({
              ...resource,
              reloading: undefined,
              value
            })
          }
        }
      }, state)

    } else if (action.type === 'http:fetch:failed') {
      return action.keys.reduce((state, key): ResourceStateMap => {
        const resource = state[key]

        if (!resource || resource.status !== 'loaded') {
          return {
            ...state,
            [key]: {
              status: 'failed',
              error: action.error
            }
          }
        } else {
          return {
            ...state,
            [key]: stripUndefined({
              ...resource,
              reloading: undefined,
              error: action.error
            })
          }
        }
      }, state)

    } else if (action.type === 'http:mutation:start') {
      const { payload } = action

      return Object.keys(payload).reduce((state, key): ResourceStateMap => {
        const mutation = payload[key]
        const resource = state[key]

        if (!resource || resource.status !== 'loaded') {
          throw new Error(`Resource ${key} must have been fetched before it is mutated`)
        }

        if (resource.mutation) {
          throw new Error(`Resource ${key} already has a mutation pending`)
        }

        if (resource.reloading) {
          throw new Error(`Resource ${key} cannot be mutated while is being fetched`)
        }

        return {
          ...state,
          [key]: {
            ...resource,
            mutation
          }
        }
      }, state)

    } else if (action.type === 'http:mutation:complete') {
      const { payload } = action

      return Object.keys(payload).reduce((state, key): ResourceStateMap => {
        const resource = state[key]
        const mutation = payload[key]

        if (!resource || resource.status !== 'loaded') {
          throw new Error(`Resource ${key} must have been fetched before it is mutated`)
        }

        if (resource.reloading) {
          throw new Error(`Resource ${key} cannot be mutated while is being fetched`)
        }

        if (mutation.type === 'delete') {
          return {
            ...state,
            [key]: { status: 'deleted' }
          }

        } else {
          return {
            ...state,
            [key]: stripUndefined({
              ...resource,
              mutation: undefined,
              value: applyResourceMutation(resource.value, mutation)
            })
          }
        }
      }, state)

    } else if (action.type === 'http:mutation:failed') {
      // [todo] - Mutation errors aren't currently stored and passed back to the UI
      console.error(action.error)

      return action.keys.reduce((state, key): ResourceStateMap => {
        const resource = state[key]

        return {
          ...state,
          [key]: stripUndefined({
            ...resource,
            mutation: undefined
          })
        }
      }, state)
    }

    return state
  }
}

function stripUndefined<T>(x: T): T {
  Object.keys(x).forEach(k => {
    let obj = x as any
    if (obj[k] === undefined) delete obj[k]
  })
  return x
}
