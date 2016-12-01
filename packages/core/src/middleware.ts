import { assign } from 'lodash'

import { MountResponse, defaultResponse } from './response'

/**
 * The bulding block of the mount pipeline.
 *
 * Given a request, returns a response, optionally passing the request
 * and response down the middleware chain and optionally transforming
 * the response from the next middleware.
 */
export interface Middleware<InProps, OutProps> {
  (request: InProps, next: NextFn<OutProps>)
  : Promise<MountResponse>
}

export interface GenericMiddleware {
  <T>(request: T, next: NextFn<{}>)
  : Promise<MountResponse>
}

/** Represents the next function in the middleware chain */
export interface NextFn<Req> {
  (request: Req)
  : Promise<MountResponse>
}


/**
 * Sequence 2 functions in the middleware chain
 */
export function compose<
  R1,
  R2,
  R3
>
(lhs: Middleware<R1, R2>, rhs: Middleware<R2, R3>): Middleware<R1, R3> {
  return (req1, next) => (
    lhs(req1, req2 => rhs(assign({}, req1, req2), next))
  )
}


/**
 * Terminate the middleware sequence
 */
export function terminate(): NextFn<{}> {
  return async () => defaultResponse()
}


/**
 * Passthrough middleware.
 */
export function noop(): GenericMiddleware {
  return <Req>(req: Req, next: NextFn<Req>) => next(req)
}
