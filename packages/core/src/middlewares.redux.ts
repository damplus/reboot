import { createStore as defaultCreateStore, Action, Reducer, Store as ReduxStore } from 'redux'
import { Stream } from 'xstream'
import { assign } from 'lodash'

import { Middleware } from './middleware'

export interface Store<T> {
  dispatch(a: Action): void
  bind<P>(actionCreator: ActionCreator<P>): (param: P) => void
  select$<C>(fn: (state: T) => C): Stream<C>

  addReducers<Shape>(r: ReducersMap<Shape>): Store<T | Shape>
}

export function addStore(createStore?: () => ReduxStore<{}>): Middleware<{}, { store: Store<{}> }> {
  return (req, next) => {
    let unsubscribe = () => {}
    const reduxStore = createStore ? createStore() : defaultCreateStore(() => ({}))
    const $ = Stream.createWithMemory({
      start: listener => {
        unsubscribe = reduxStore.subscribe(() => {
          listener.next(reduxStore.getState())
        })
      },
      stop: () => unsubscribe()
    })

    return next({
      store: wrapStore({
        $,
        store: reduxStore,
        reducers: {}
      })
    })
  }
}

export function addReducers<Prev, Next>(reducers: ReducersMap<Next>): Middleware<{ store: Store<Prev> }, { store: Store<Prev | Next> }> {
  return ({ store }, next) => next({
    store: store.addReducers(reducers)
  })
}

function wrapStore<T>({ store, reducers, $ }: { store: ReduxStore<T>, reducers: {}, $: Stream<T> }): Store<T> {
  return {
    dispatch: store.dispatch,
    bind: <P>(ac: ActionCreator<P>) => (p: P) => { store.dispatch(ac(p)) },
    select$: <C>(fn: (state: T) => C) => $.map(fn),
    addReducers: <Shape>(rs: ReducersMap<Shape>) => {
      return wrapStore({ store, reducers: assign(reducers, rs), $ })
    }
  }
}

export interface ActionCreator<P> {
  (params: P): Action
}

export interface ReducersMap<Shape> {
  [key: string]: Reducer<Shape>
}
