import { Transition } from './transition'

export interface BaseRequest {
  /**
   * The current page's location descriptor
   */
  location: Transition<{}, {}>
}
