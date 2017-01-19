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


  cookies: Cookies
}

export interface Cookies {
  get(key: string): string | undefined
  set(key: string, value: string, opts?: CookieOpts): void
  delete(key: string): void
}

export interface CookieOpts {
  expires?: Date
  secure?: boolean
  httpOnly?: boolean
  path?: string
  domain?: string
}

export interface HasState<T> {
  store: Store<T>
}
