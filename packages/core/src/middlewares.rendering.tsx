import * as React from 'react'
import { assign } from 'lodash'
import { Stream } from 'xstream'

import { mapResponse } from './response'
import { Middleware } from './middleware'
import { toStream } from './util'

export type RenderFn<R, T> = (req: R) => T | Stream<T>
export type RenderMiddleware<R> = Middleware<R, {}>

export function render<R>(fn: RenderFn<R, React.ReactElement<{}>>): RenderMiddleware<R> {
  return (req, next) => next(req).then(
    mapResponse(res =>
      assign(res, {
        body: res.body || toStream(fn(req))
      })
    )
  )
}

export function renderContainer<R>(fn: RenderFn<R, React.ReactElement<{}>>): RenderMiddleware<R> {
  return (req, next) => next(req).then(
    mapResponse(res =>
      assign(res, {
        body: res.body && Stream.combine(toStream(fn(req)), res.body).map(x =>
          React.cloneElement(x[0], {}, x[1])
        )
      })
    )
  )
}

export function renderTitle<R>(fn: RenderFn<R, string>): RenderMiddleware<R> {
  return (req, next) => next(req).then(
    mapResponse(res =>
      assign(res, {
        title: toStream(fn(req))
      })
    )
  )
}
