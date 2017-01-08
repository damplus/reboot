import * as React from 'react'
import { Stream, Listener } from 'xstream'
import { size } from 'lodash'
import * as qs from 'querystring'

import { RouteWithParams } from './route'
import { log } from './util'

export interface QueryParams {
  [key: string]: string[] | string | undefined
}

export interface Transition<RouteParams, Params extends RouteParams> {
  handler: RouteWithParams<RouteParams> | (() => RouteWithParams<RouteParams>)
  params: Params
  queryParams?: QueryParams
}

let transitionListener: Listener<string>

export const transition$ = Stream.create<string>({
  start(listener) {
    transitionListener = listener
  },
  stop() {}
})

export function requestTransition<RouteParams, Params extends RouteParams>(t: Transition<RouteParams, Params> | string) {
  if (transitionListener) {
    log.trace('Transition requested:', stringifyTransition(t))
    transitionListener.next(stringifyTransition(t))
  }
}

export function stringifyTransition<RouteParams, Params extends RouteParams>(t: Transition<RouteParams, Params> | string): string {
  if (typeof t === 'string') return t

  const handler = (typeof t.handler === 'function') ? t.handler() : t.handler

  let str = handler.path.split('/')
    .map(c => c[0] === ':' && (t.params as any)[c.substr(1)] || c)
    .join('/')

  if (t.queryParams && size(t.queryParams) > 0) {
    str += '?' + qs.stringify(t.queryParams)
  }

  return str
}

export function transitionProps<RouteParams, Params extends RouteParams>(target: Transition<RouteParams, Params>): React.HTMLProps<HTMLAnchorElement> {
  return {
    href: stringifyTransition(target),
    onClick: e => {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        requestTransition(target)
        e.preventDefault()
      }
    }
  }
}
