import * as React from 'react'
import { Stream, Listener } from 'xstream'
import { size, omit } from 'lodash'
import * as qs from 'querystring'

import { MountRequest, QueryParams } from './request'
import { Route } from './route'

export class Transition<Params> {
  handler: Route<MountRequest & Params> | (() => Route<MountRequest & Params>)
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

export function requestTransition<T>(t: Transition<T>) {
  if (transitionListener) {
    transitionListener.next(stringifyTransition(t))
  }
}

export function stringifyTransition<T>(t: Transition<T> | string): string {
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

export function Link(props: React.HTMLProps<HTMLElement> & { route: Transition<{}> }) {
  return (
    <a
      {...omit(props, 'route')}
      href={stringifyTransition(props.route)}
      onClick={e => {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          requestTransition(props.route)
          e.preventDefault()
        }
      }}
    />
  )
}
