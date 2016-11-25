import { Route } from './route'
import { isEqual } from 'lodash'

export interface QueryParams {
  [key: string]: string[] | string | undefined
}

export interface MountRequest {
  /**
   * The environment of the request
   */
  environment: 'client' | 'server'

  /**
   * The route being mounted
   */
  route: Route<MountRequest>


  /** Query parameters in the url */
  queryParams: QueryParams

  /**
   * Opaque object containing path parameters.
   *
   * Don't use this directly, use the second parameter to a route instance's
   * `subroute` method to to extract the parameters in a typesafe manner
   **/
  pathParams: {}
}

export function equalRoutes(r1: MountRequest, r2: MountRequest): boolean {
  return (
    r1.route.path === r2.route.path
    && isEqual(r1.pathParams, r2.pathParams)
    && isEqual(r1.queryParams || {}, r2.queryParams || {})
  )
}
