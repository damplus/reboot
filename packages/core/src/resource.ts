import { Stream } from 'xstream'
import { assign, values } from 'lodash'

import { Store } from './middlewares.redux'
import { AsyncValue, MissingAsyncValue, PresentAyncValue } from './async-value'

export type ResourceMutation<T>
= { type: 'put', value: T }
| { type: 'patch', deltaValue: Partial<T> }
| { type: 'delete' }

export function resourceValue<T>(s?: ResourceState<T>): AsyncValue<T> {
  if (!s) throw new Error('Missing resource value. Did you forget to fetch the resource?')

  if (s.status === 'loaded') {
    return new PresentAyncValue(s)

  } else {
    return new MissingAsyncValue(s)
  }
}

export class Resource<T> {
  private store: Store<{ [key: string]: ResourceStateMap }>
  private key: string

  constructor(opts: { key: string, store: Store<{}> }) {
    this.store = opts.store.addReducer(opts.key, httpResourceReducer(opts.key))
    this.key = opts.key
  }

  $(): Stream<AsyncValue<T>[]>
  $(predicate: (x: AsyncValue<T>) => boolean): Stream<AsyncValue<T>[]>
  $(key: string): Stream<AsyncValue<T>>

  $(selector?: string | ((x: AsyncValue<{}>) => boolean)): Stream<any> {
    if (typeof selector === 'function') {
      return this.store.select$(state => {
        const resourceState = state[this.key]
        return resourceState && values(resourceState)
          .map(resourceValue)
          .filter(x => x && selector(x)) || []
      })

    } else if (typeof selector === 'string') {
       return this.store.select$(state => {
        const resourceState = state[this.key]
        return resourceState && resourceValue(resourceState[selector] || undefined)
      })

    } else {
       return this.store.select$(state => {
        const resourceState = state[this.key]
        return resourceState && values(resourceState).map(resourceValue).filter(x => x) || []
      })
    }
  }

  fetch(key: string, fetchImpl: () => Promise<T>): void {
    return this.fetchMany([key], () => fetchImpl().then(value => ({ [key]: value })))
  }

  fetchMany(keys: string[], fetchImpl: () => Promise<{ [key: string]: T }>): void {
    keys = keys.filter(k => {
      const state = this.store.getState()[this.key][k]
      return !(state && state.status === 'loading')
    })
    if (keys.length === 0) {
      return
    }

    this.store.dispatch<ResourceAction>({ type: 'http:fetch:start', resourceKey: this.key, keys })

    Promise.resolve().then(fetchImpl).then(
      (payload) => {
        this.store.dispatch<ResourceAction>({ type: 'http:fetch:complete', resourceKey: this.key, payload })
      },
      (error) => {
        this.store.dispatch<ResourceAction>({ type: 'http:fetch:failed', resourceKey: this.key, keys, error })
      }
    )
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
}

export function applyResourceMutation<T>(value: T, mutation?: ResourceMutation<T>): T {
  if (!mutation) {
    return value
  }

  if (mutation.type === 'delete') {
    return value

  } else if (mutation.type === 'patch') {
    return value && assign({}, value, mutation.deltaValue)

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
