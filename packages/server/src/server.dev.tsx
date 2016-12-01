import * as React from 'react'
import * as path from 'path'
import { renderToStaticMarkup } from 'react-dom/server'
import { RequestHandler } from 'express'

import { ServeOpts } from './index'
import { WebpackOpts } from './webpack-config'

export function devMiddleware(entry: string, opts: ServeOpts = {}): RequestHandler {
  const { compose } = require('compose-middleware')

  const hot = require('webpack-hot-middleware')
  const devserver = require('webpack-dev-middleware')
  const { webpackConfig } = require('./webpack-config')

  const config : WebpackOpts = {
    debug: true,
    devserver: true,
    entry,
    extractStyles: false,
    includedModules: [],
    minify: false,
    outDir: '/',
    target: 'web'
  }

  const compiler = require('webpack')(webpackConfig(config))

  return compose([
    devserver(compiler, {
      publicPath: '/',
      stats: true,
      historyApiFallback: true,
    }),
    hot(compiler),
    devRenderMiddleware(opts),
  ])
}

function devRenderMiddleware(opts: ServeOpts): RequestHandler {
  return (req, res, next) => {
    if (path.extname(req.path)) {
      next()
      return
    }

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.write('<!doctype html>')
    res.write(
      renderToStaticMarkup(
        <html>
          <head>
            <meta charSet="utf8" />
            <title></title>
            {opts.head && (opts.head.props as any).children}
          </head>
          <body>
            <div id="app" />
            <script src="/bundle.js" />
          </body>
        </html>
      )
    )
    res.end()
  }
}
