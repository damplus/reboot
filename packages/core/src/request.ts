import { Transition } from './transition'
import { Store } from './store'

export interface BaseRequest {
  /**
   * The current page's location descriptor
   */
  location: Transition<{}, {}>


  /**
   * The application's state container
   */
  store: Store<{}>
}

export interface HasState<T> {
  store: Store<T>
}
