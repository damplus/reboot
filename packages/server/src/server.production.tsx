import * as React from 'react'
import * as path from 'path'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import { RequestHandler } from 'express'
import { BaseRequest, createMatcher, Route } from 'reboot-core'

import { render } from './render'
import { ServeOpts } from './index'

export function renderMiddleware(buildDir: string, opts: ServeOpts = {}): RequestHandler {
  const routes: RouteDeclaration[] = require(path.resolve(path.join(buildDir, 'bundle.js'))).default

  const matcher = createMatcher<Route<BaseRequest>>()
  routes.forEach(r => {
    const route = unpackRouteDeclaration(r)
    matcher.add([{ path: route.path, handler: route }])
  })

  return (req, res, next) => (
    Promise.resolve().then(() =>
      render({
        matcher,
        query: req.query,
        pathname: req.path
      })
    )
    .then(output => {
      if (output.location) {
        res.redirect(output.status, output.location)
        return
      }

      res.status(output.status)
      res.write('<!doctype html><html>')
      res.write(
        renderToStaticMarkup(
          <head>
            <meta charSet="utf8" />
            {output.title && <title>{output.title}</title>}
            <script async defer src="/bundle.js" />
            <link rel="stylesheet" href="/style.css" />
            {opts.head && (opts.head.props as any).children}
          </head>
        )
      )
      res.write('<body><div id="app">')
      res.write(renderToString(output.body || <div />))
      res.write('</div></body></html>')
      res.end()
    })
    .catch(next)
  )
}

export type RouteDeclaration = Route<BaseRequest> | (() => Route<BaseRequest>)

export function unpackRouteDeclaration(routeDeclaration: RouteDeclaration): Route<BaseRequest> {
  return (typeof routeDeclaration === 'function') ? routeDeclaration() : routeDeclaration
}
