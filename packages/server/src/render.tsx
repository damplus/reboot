import * as React from 'react'
import { Stream } from 'xstream'
import * as qs from 'querystring'

import {
  terminalNext,
  MountRequest,
  Matcher,
  Route,
  stringifyTransition
} from 'reboot-core'

import { toPromise, toStream } from './util'

export interface MountParams {
  matcher: Matcher<Route<MountRequest>>
  pathname: string
  query: string
}

export interface RenderOutput {
  status: number
  location?: string
  title?: string
  body?: React.ReactElement<{}>
}

export function render(params: MountParams): Promise<RenderOutput> {
  const [route] = params.matcher.recognize(params.pathname)
  if (!route) {
    return Promise.reject(new Error('Failed to match {params.path}'))
  }

  const req: MountRequest = {
    environment: 'server',
    route: route.handler,
    pathParams: route.params,
    queryParams: qs.parse(params.query)
  }

  return route.handler.middleware(req, terminalNext()).then((response): RenderOutput | Promise<RenderOutput> => {
    if (response.state === 'render') {
      return toPromise(
        Stream.combine(
          response.title.take(1),
          toStream<React.ReactElement<{}> | undefined>(response.body).take(1)
        )
        .map(tb => ({
          status: response.status || 200,
          title: tb[0],
          body: tb[1],
        }))
      )

    } else {
      const location = stringifyTransition(response.location)
      if (location === stringifyTransition(route)) {
        throw new Error(
          `Encountered recursive redirect (${stringifyTransition(route)} => ${stringifyTransition(response.location)})`
        )
      }

      return {
        status: response.status || 301,
        location
      }
    }
  })
}
