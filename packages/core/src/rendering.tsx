import * as React from 'react'
import { Stream } from 'xstream'

import { mapResponse } from './response'
import { Middleware } from './middleware'
import { toStream } from './util'

export type RenderFn<R, T> = (req: R) => T | Stream<T>
export type Renderable<R, T> = RenderFn<R, T> | T
export type RenderMiddleware<R> = Middleware<R, {}>

export function render<R>(fn: Renderable<R, React.ReactElement<{}>>): RenderMiddleware<R> {
  return (req, next) => next(req).then(
    mapResponse(res => ({
      ...res,
      body: res.body || applyRenderable(fn, req)
    }))
  )
}

export function renderContainer<R>(fn: Renderable<R, React.ReactElement<{}>>): RenderMiddleware<R> {
  return (req, next) => next(req).then(
    mapResponse(res => ({
      ...res,
      body: res.body && Stream.combine(applyRenderable(fn, req), res.body).map(x =>
        React.cloneElement(x[0], {}, x[1])
      )
    }))
  )
}

export function renderTitle<R>(fn: Renderable<R, string>): RenderMiddleware<R> {
  return (req, next) => next(req).then(
    mapResponse(res => ({
      ...res,
      title: applyRenderable(fn, req)
    }))
  )
}

function applyRenderable<Req, T>(render: Renderable<Req, T>, req: Req): Stream<T> {
  if (typeof render !== 'function') return toStream(render)
  else return toStream(render(req))
}
