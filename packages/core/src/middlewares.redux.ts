import { createStore as defaultCreateStore, combineReducers, Action, Reducer, ReducersMapObject, Store as ReduxStore } from 'redux'
import { Stream } from 'xstream'

import { Middleware } from './middleware'

export interface Store<T> {
  dispatch(a: Action): void
  bind<P>(actionCreator: ActionCreator<P>): (param: P) => void

  select$<C>(fn: (state: T) => C): Stream<C>
  select$<Key extends keyof T>(key: Key): Stream<T[Key]>

  addReducer<Key extends string, Shape>(key: Key, r: Reducer<Shape>): Store<T & Record<Key, Shape>>
}

export interface StoreRequest<T> {
  store: Store<T>
}

/**
 * Attaches a redux store to the request.
 *
 * This should be done once on the '/' route if you want to use redux to manage
 * application state.
 **/
export function addStore(createStore?: () => ReduxStore<{}>): Middleware<{}, StoreRequest<{}>> {
  return (req, next) => {
    let unsubscribe = () => {}
    const reduxStore = createStore ? createStore() : defaultCreateStore(() => ({}))
    const $ = Stream.create({
      start: listener => {
        listener.next(reduxStore.getState())
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

/**
 * Attaches a reducer to the redux store. The reducer will mange state with the provided key
 * (as if it were added to the store via `combineReducers()`).
 *
 * State managed by this reducer will be scoped to the route it is attached to. When the route
 * is unmounted, the state will be discarded.
 **/
export function addReducer<Key extends string, Shape>(key: Key, reducer: Reducer<Shape>): Middleware<StoreRequest<{}>, StoreRequest<Record<Key, Shape>>> {
  return ({ store }, next) => next({
    store: store.addReducer(key, reducer)
  })
}

function wrapStore<T>({ store, reducers, $ }: { store: ReduxStore<T>, reducers: ReducersMapObject, $: Stream<T> }): Store<T> {
  return {
    dispatch: store.dispatch,
    bind: <P>(ac: ActionCreator<P>) => (p: P) => { store.dispatch(ac(p)) },
    select$: <C>(fn: (state: T) => C) => $.map(fn),
    addReducer: <Key extends string, Shape>(key: Key, fn: Reducer<Shape>): Store<T & Record<Key, Shape>> => {
      const nextReducers = { ...reducers, [key as any]: fn }
      store.replaceReducer(combineReducers<T>(nextReducers))

      return wrapStore({ store, reducers: nextReducers, $ })
    }
  }
}

export interface ActionCreator<P> {
  (params: P): Action
}
