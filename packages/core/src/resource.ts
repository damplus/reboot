import { Stream } from 'xstream'
import { assign, values } from 'lodash'

import { Store } from './middlewares.redux'

export type ResourceState<T>
= { status: 'loading' }
| { status: 'loaded', value: T, mutation?: ResourceMutation<T>, reloading?: boolean }
| { status: 'failed', error: Error }
| { status: 'deleted' }

export type ResourceMutation<T>
= { type: 'put', value: T }
| { type: 'patch', value: Partial<T> }
| { type: 'delete' }

export class Resource<T> {
  private store: Store<{ [key: string]: ResourceStateMap }>
  private key: string

  constructor(opts: { key: string, store: Store<{}> }) {
    this.store = opts.store.addReducer(opts.key, reduceHTTPResource)
    this.key = opts.key
  }

  $(): Stream<ResourceState<T>[]>
  $(predicate: (x: ResourceState<T>) => boolean): Stream<ResourceState<T>[]>
  $(key: string): Stream<ResourceState<T> | undefined>

  $(selector?: string | ((x: ResourceState<{}>) => boolean)): Stream<any> {
    if (typeof selector === 'function') {
      return this.store.select$(state => {
        const resourceState = state[this.key]
        return resourceState && values(resourceState).filter(x => x && selector(x)) || []
      })

    } else if (typeof selector === 'string') {
       return this.store.select$(state => {
        const resourceState = state[this.key]
        return resourceState && resourceState[selector] || undefined
      })

    } else {
       return this.store.select$(state => {
        const resourceState = state[this.key]
        return resourceState && values(resourceState).filter(x => x) || []
      })
    }
  }

  fetch(key: string, fetchImpl: () => Promise<T>): void {
    return this.fetchMany([key], () => fetchImpl().then(value => ({ [key]: value })))
  }

  fetchMany(keys: string[], fetchImpl: () => Promise<{ [key: string]: T }>): void {
    this.store.dispatch<ResourceAction>({ type: 'http:fetch:start', keys })

    Promise.resolve().then(fetchImpl).then(
      (payload) => {
        this.store.dispatch<ResourceAction>({ type: 'http:fetch:complete', payload })
      },
      (error) => {
        this.store.dispatch<ResourceAction>({ type: 'http:fetch:failed', keys, error })
      }
    )
  }

  mutate(key: string, mutation: ResourceMutation<T>, effect: () => Promise<any>): void {
    return this.mutateMany({ [key]: mutation }, effect)
  }

  mutateMany(mutations: { [selector: string]: ResourceMutation<T> }, effect: () => Promise<any>): void {
    this.store.dispatch<ResourceAction>({ type: 'http:mutation:start', payload: mutations })

    Promise.resolve().then(effect).then(
      () => {
        this.store.dispatch<ResourceAction>({ type: 'http:mutation:complete', payload: mutations })
      },
      (error) => {
        this.store.dispatch<ResourceAction>({ type: 'http:mutation:failed', keys: Object.keys(mutations), error })
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
    return value && assign({}, value, mutation.value)

  } else {
    return mutation.value
  }
}


/** State */

export type ResourceAction
= { type: 'http:fetch:start', keys: string[] }
| { type: 'http:fetch:complete', payload: { [key: string]: {} } }
| { type: 'http:fetch:failed', keys: string[], error: Error }
| { type: 'http:mutation:start', payload: { [key: string]: ResourceMutation<{}> } }
| { type: 'http:mutation:complete', payload: { [key: string]: ResourceMutation<{}> } }
| { type: 'http:mutation:failed', keys: string[], error: Error }

export type ResourceStateMap
= { [key: string]: ResourceState<{}> | undefined }

export function reduceHTTPResource(state: ResourceStateMap = {}, action: ResourceAction | { type: '' }): ResourceStateMap {
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

function stripUndefined<T>(x: T): T {
  Object.keys(x).forEach(k => {
    let obj = x as any
    if (obj[k] === undefined) delete obj[k]
  })
  return x
}
