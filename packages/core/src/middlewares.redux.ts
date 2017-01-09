import { createStore as defaultCreateStore, combineReducers, Action, Reducer, ReducersMapObject, Store as ReduxStore } from 'redux'
import { Stream } from 'xstream'
import dropRepeats from 'xstream/extra/dropRepeats'

import { Middleware } from './middleware'

export interface Store<T> {
  dispatch<A extends Action>(a: A): void
  bind<P>(actionCreator: ActionCreator<P>): (param: P) => void

  select$<C>(fn: (state: T) => C): Stream<C>
  select$<Key extends keyof T>(key: Key): Stream<T[Key]>

  addReducer<Key extends string, Shape>(key: Key, r: Reducer<Shape>): Store<T & Record<Key, Shape>>
  getState(): T
}

export interface StoreRequest<T> {
  store: Store<T>
}

declare const __REDUX_DEVTOOLS_EXTENSION__: any

// [todo] - Move this onto the request object when route diffing implemented
const reduxStore = defaultCreateStore(() => ({}),
  (typeof __REDUX_DEVTOOLS_EXTENSION__ !== 'undefined')
  ? __REDUX_DEVTOOLS_EXTENSION__()
  : undefined
)

/**
 * Attaches a redux store to the request.
 *
 * This should be done once on the '/' route if you want to use redux to manage
 * application state.
 **/
export function addStore(): Middleware<{}, StoreRequest<{}>> {
  return (req, next) => {
    let unsubscribe = () => {}

    const $ = Stream.createWithMemory({
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

export function addReducer<Key extends string, Shape>(key: Key, reducer: Reducer<Shape>): Middleware<StoreRequest<{}>, StoreRequest<Record<Key, Shape>>> {
  return ({ store }, next) => next({
    store: store.addReducer(key, reducer)
  })
}

function wrapStore<T>({ store, reducers, $ }: { store: ReduxStore<T>, reducers: ReducersMapObject, $: Stream<T> }): Store<T> {
  const reducerMap = reducers as any
  const wrapper = {
    dispatch: store.dispatch,
    bind: <P>(ac: ActionCreator<P>) => (p: P) => { store.dispatch(ac(p)) },
    select$: <C>(fn: (state: T) => C) => $.map(fn).compose(dropRepeats()),
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
