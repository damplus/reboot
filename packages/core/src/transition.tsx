import * as React from 'react'
import { size } from 'lodash'
import * as qs from 'querystring'

import { DataStream, Listener} from './stream'
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

const globalObject = new Function('return this') as (() => { __reboot_page_transition_source?: Listener<string> })

export const transition$ = DataStream.create<string>({
  start(listener) {
    globalObject().__reboot_page_transition_source = listener
  },
  stop() {}
})

export function requestTransition<RouteParams, Params extends RouteParams>(t: Transition<RouteParams, Params> | string) {
  const listener = globalObject().__reboot_page_transition_source

  if (listener) {
    log.trace('Transition requested:', stringifyTransition(t))
    listener.next(stringifyTransition(t))

  } else {
    log.trace('Transition ignored because no listener is registered')
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
