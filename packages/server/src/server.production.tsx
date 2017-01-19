import * as React from 'react'
import * as path from 'path'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import { RequestHandler } from 'express'
import { AnyRoute, createMatcher } from 'reboot-core'

import { render } from './render'
import { ServeOpts } from './index'

export function renderMiddleware(buildDir: string, opts: ServeOpts = {}): RequestHandler {
  const routes: RouteDeclaration[] = require(path.resolve(path.join(buildDir, 'bundle.js'))).default

  const matcher = createMatcher<AnyRoute>()
  routes.forEach(r => {
    const route = unpackRouteDeclaration(r)
    matcher.add([{ path: route.path, handler: route }])
  })

  return (req, res, next) => (
    Promise.resolve().then(() =>
      render({
        matcher,
        query: req.query,
        pathname: req.path,
        cookies: {
          get: (key) => req.cookies[key],
          set: (key, value, opts) => res.cookie(key, value, opts || {}),
          delete: (key) => res.clearCookie(key)
        }
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

export type RouteDeclaration = AnyRoute | (() => AnyRoute)

export function unpackRouteDeclaration(routeDeclaration: RouteDeclaration): AnyRoute {
  return (typeof routeDeclaration === 'function') ? routeDeclaration() : routeDeclaration
}
