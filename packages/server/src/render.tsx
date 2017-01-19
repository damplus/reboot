import * as React from 'react'
import { DataStream, Cookies } from 'reboot-core'
import * as qs from 'querystring'

import {
  terminalNext,
  BaseRequest,
  Matcher,
  AnyRoute,
  stringifyTransition,
  createStore
} from 'reboot-core'

export interface MountParams {
  matcher: Matcher<AnyRoute>
  pathname: string
  query: string
  cookies: Cookies
}

export interface RenderOutput {
  status: number
  location?: string
  title?: string
  body?: React.ReactElement<{}>
}

export function render(params: MountParams): Promise<RenderOutput> {
  const [location] = params.matcher.recognize(params.pathname)
  if (!location) {
    return Promise.reject(new Error('Failed to match {params.path}'))
  }

  const req: BaseRequest = {
    location,
    store: createStore(),
    cookies: params.cookies
  }

  return location.handler.apply(req, terminalNext()).then((response): RenderOutput | Promise<RenderOutput> => {
    if (response.state === 'render') {
      return DataStream.combine(
        response.title.take(1),
        (response.body || DataStream.error(new Error('No body present'))).take(1)
      )
      .map(tb => ({
        status: response.status || 200,
        title: tb[0],
        body: tb[1],
      }))
      .collect()
      .then(x => x[0])

    } else {
      const address = stringifyTransition(response.location)
      if (address === stringifyTransition({ handler: location.handler, params: location.params, queryParams: qs.parse(params.query) })) {
        throw new Error(
          `Encountered recursive redirect (${stringifyTransition(address)} => ${stringifyTransition(response.location)})`
        )
      }

      return {
        status: response.status || 301,
        location: address
      }
    }
  })
}
