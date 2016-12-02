import { Stream } from 'xstream'

import { Middleware } from './middleware'
import { Store, StoreRequest } from './middlewares.redux'
import { requestProps, requestProp } from './middlewares.request'


export interface HttpClient {
  (url: string, opts?: RequestInit): Promise<Response>
}

export interface HasHTTPClient {
  http: HttpClient
  store: Store<HasResourceState>
}

export type HasResource<Key extends string, Value> = Record<Key, HTTPResource<Value>>

export function addClient(): Middleware<StoreRequest<{}>, HasHTTPClient> {
  if (typeof fetch === 'undefined') {
    throw new Error('fetch() is not defined. Please ensure that you have the appropriate polyfill installed')
  }

  return requestProps(({ store }: StoreRequest<{}>) => ({
    store: store.addReducer('httpResourceState', reduceHTTPResource),
    http: fetch
  }))
}


export interface HTTPResourceParams<Value> {
  url: string
  validateResponse: (x: {}) => Value
}

export function addResource<Key extends string, Value>(key: Key, opts: HTTPResourceParams<Value>): Middleware<HasHTTPClient, HasResource<Key, Value>> {
  return requestProp(key, (client: HasHTTPClient) => fetchHTTPResource(client, opts))
}



/** REST Resource */

export type ResourceState<T>
= { status: 'initial', mutation?: ResourceMutation<T>, fetching?: boolean }
| { status: 'fetched', value: T, mutation?: ResourceMutation<T>, fetching?: boolean }
| { status: 'deleted' }

export type ResourceMutation<T>
= { status: 'updating', nextValue: T }
| { status: 'deleting' }


export interface HTTPResource<Value> {
  $: Stream<ResourceState<Value>>

  fetch(): void
  put(x: Value): void
  patch(x: Partial<Value>): void
  delete(): void
}

export function fetchHTTPResource<Value>({ store, http }: HasHTTPClient, { url, validateResponse }: HTTPResourceParams<Value>): HTTPResource<Value> {
  return {
    $: store.select$(x => x.httpResourceState[url] as ResourceState<Value>),

    async fetch() {
      store.dispatch<ResourceAction>({ type: 'http:fetch:start', url })

      try {
        const json = await http(url).then(validateStatus).then(r => r.json())
        const payload = validateResponse(json)
        store.dispatch<ResourceAction>({ type: 'http:fetch:complete', url, payload })

      } catch (error) {
        store.dispatch<ResourceAction>({ type: 'http:fetch:failed', url })
      }
    },

    async put(x: Value) {
      store.dispatch<ResourceAction>({ type: 'http:update:start', url, payload: x })

      try {
        await http(url, { method: 'put', body: JSON.stringify(x) }).then(validateStatus)
        store.dispatch<ResourceAction>({ type: 'http:update:complete', url, payload: x })

      } catch (error) {
        store.dispatch<ResourceAction>({ type: 'http:update:failed', url })
      }
    },

    async patch(x: Partial<Value>) {
      store.dispatch<ResourceAction>({ type: 'http:update:start', url, payload: x })

      try {
        await http(url, { method: 'patch', body: JSON.stringify(x) }).then(validateStatus)
        store.dispatch<ResourceAction>({ type: 'http:update:complete', url, payload: x })

      } catch (error) {
        store.dispatch<ResourceAction>({ type: 'http:update:failed', url })
      }
    },

    async delete() {
      store.dispatch<ResourceAction>({ type: 'http:delete:start', url })

      try {
        await http(url, { method: 'delete' }).then(validateStatus)
        store.dispatch<ResourceAction>({ type: 'http:delete:complete', url })

      } catch (error) {
        store.dispatch<ResourceAction>({ type: 'http:delete:failed', url })
      }
    }
  }
}

async function validateStatus(r: Response): Promise<Response> {
  if (r.status >= 300) {
    const message = await r.text()
    throw new Error(message)

  } else {
    return r
  }
}

/** State */

export type ResourceAction
= { type: 'http:fetch:start', url: string }
| { type: 'http:fetch:complete', url: string, payload: {} }
| { type: 'http:fetch:failed', url: string }
| { type: 'http:update:start', url: string, payload: {} }
| { type: 'http:update:complete', url: string, payload: {} }
| { type: 'http:update:failed', url: string }
| { type: 'http:delete:start', url: string }
| { type: 'http:delete:complete', url: string }
| { type: 'http:delete:failed', url: string }

export type ResourceStateMap
= { [url: string]: ResourceState<{}> | undefined }

export type HasResourceState
= { httpResourceState: ResourceStateMap }

export function reduceHTTPResource(state: ResourceStateMap = {}, action: ResourceAction | { type: '' }): ResourceStateMap {
  if (action.type === 'http:fetch:start') {
    const resource = getPreviousResourceState(state, action)
    if (resource.status === 'deleted') return state

    return {
      ...state,
      [action.url]: {
        ...resource,
        fetching: true
      }
    }

  } else if (action.type === 'http:fetch:complete') {
    const resource = getPreviousResourceState(state, action)
    if (resource.status === 'deleted') return state

    return {
      ...state,
      [action.url]: {
        ...resource,
        status: 'fetched',
        fetching: false,
        value: action.payload
      }
    }

  } else if (action.type === 'http:update:start') {
    const resource = getPreviousResourceState(state, action)
    if (resource.status === 'deleted') return state
    if (resource.mutation && resource.mutation.status === 'deleting') return state

    return {
      ...state,
      [action.url]: {
        ...resource,
        mutation: { status: 'updating', nextValue: action.payload }
      }
    }

  } else if (action.type === 'http:update:complete') {
    const resource = getPreviousResourceState(state, action)
    if (resource.status === 'deleted') return state
    if (resource.mutation && resource.mutation.status === 'deleting') return state

    return {
      ...state,
      [action.url]: {
        ...resource,
        mutation: undefined,
        value: action.payload
      }
    }

  } else if (action.type === 'http:delete:start') {
    const resource = getPreviousResourceState(state, action)
    if (resource.status === 'deleted') return state
    if (resource.mutation && resource.mutation.status === 'deleting') return state

    return {
      ...state,
      [action.url]: {
        ...resource,
        mutation: { status: 'deleting' }
      }
    }

  } else if (action.type === 'http:delete:complete') {
    return {
      ...state,
      [action.url]: { status: 'deleted' }
    }
  }

  return state
}

function getPreviousResourceState(state: ResourceStateMap, action: { url: string }): ResourceState<{}> {
  return state[action.url] || { status: 'initial', fetching: false }
}
