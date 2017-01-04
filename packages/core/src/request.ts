import { Route } from './route'
import { isEqual } from 'lodash'

export interface QueryParams {
  [key: string]: string[] | string | undefined
}

export interface BaseRequest {
  /**
   * The environment of the request
   */
  environment: 'client' | 'server'

  /**
   * The route being mounted
   */
  route: Route<BaseRequest>


  /** Query parameters in the url */
  queryParams?: QueryParams

  /**
   * Opaque object containing path parameters.
   *
   * Don't use this directly, use the second parameter to a route instance's
   * `subroute` method to to extract the parameters in a typesafe manner
   **/
  pathParams: {}


  /** Re-mounts the current route */
  refresh: () => void
}

export function equalRoutes(r1: BaseRequest, r2: BaseRequest): boolean {
  return (
    r1.route.path === r2.route.path
    && isEqual(r1.pathParams, r2.pathParams)
    && isEqual(r1.queryParams || {}, r2.queryParams || {})
  )
}
