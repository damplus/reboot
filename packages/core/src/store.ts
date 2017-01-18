import { createStore as defaultCreateStore, combineReducers, Action, Reducer, ReducersMapObject, Store as ReduxStore } from 'redux'

import { DataStream } from './stream'
import { Middleware } from './middleware'
import { HasState } from './request'

export interface Store<T> {
  dispatch<A extends Action>(a: A): void
  bind<P>(actionCreator: ActionCreator<P>): (param: P) => void

  select$<C>(fn: (state: T) => C): DataStream<C>
  select$<Key extends keyof T>(key: Key): DataStream<T[Key]>

  addReducer<Key extends string, Shape>(key: Key, r: Reducer<Shape>): Store<T & Record<Key, Shape>>
  getState(): T
}

declare const __REDUX_DEVTOOLS_EXTENSION__: any

export function createStore(): Store<{}> {
  const reduxStore = defaultCreateStore(() => ({}),
    (typeof __REDUX_DEVTOOLS_EXTENSION__ !== 'undefined')
    ? __REDUX_DEVTOOLS_EXTENSION__()
    : undefined
  )

  let unsubscribe = () => {}

  const $ = DataStream.create<{}>({
    start: listener => {
      listener.next(reduxStore.getState())
      unsubscribe = reduxStore.subscribe(() => {
        listener.next(reduxStore.getState())
      })
    },
    stop: () => unsubscribe()
  })

  return wrapStore({
    $,
    store: reduxStore,
    reducers: {}
  })
}

export function addReducer<Key extends string, Shape>(key: Key, reducer: Reducer<Shape>): Middleware<HasState<{}>, HasState<Record<Key, Shape>>> {
  return ({ store }, next) => next({
    store: store.addReducer(key, reducer)
  })
}

function wrapStore<T>({ store, reducers, $ }: { store: ReduxStore<T>, reducers: ReducersMapObject, $: DataStream<T> }): Store<T> {
  const reducerMap = reducers as any
  const wrapper = {
    dispatch: store.dispatch,
    bind: <P>(ac: ActionCreator<P>) => (p: P) => { store.dispatch(ac(p)) },
    select$: <C>(fn: (state: T) => C) => $.map(fn),
    addReducer: <Key extends string, Shape>(key: Key, fn: Reducer<Shape>): Store<T & Record<Key, Shape>> => {
      reducerMap[key] = fn
      store.replaceReducer(combineReducers<T>(reducerMap))

      return wrapper as any
    },
    getState() {
      return store.getState()
    }
  }

  return wrapper
}

export interface ActionCreator<P> {
  (params: P): Action
}
