import { ReactElement } from 'react'
import { Stream } from 'xstream'

import { Transition } from './transition'

export type MountResponse
= MountRender
| MountRedirect<{}, {}>

export interface MountRender {
  state: 'render'

  /** Status code to return if running on a server (defaults to 200) */
  status?: number

  /** Page title */
  title: Stream<string>

  /** Stream of dom values */
  body?: Stream<ReactElement<{}>>
}


export interface MountRedirect<RouteParams, Params extends RouteParams> {
  state: 'redirect'

  /** Status code to return if running on a server (defaults to 301) */
  status?: number

  /** Location to redirect to */
  location: Transition<RouteParams, Params>
}


/**
 * Terminate the middleware sequence
 */
export function defaultResponse(): MountResponse {
  return {
    state: 'render',
    title: Stream.from([''])
  }
}

export function mapResponse(fn: (r: MountRender) => MountResponse): (r: MountResponse) => MountResponse {
  return r => (r.state === 'render') ? fn(r) : r
}
