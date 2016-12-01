import * as React from 'react'

export interface ServeOpts {
  head?: React.ReactElement<{}>
}

export { renderMiddleware as default } from './server.production'
export { devMiddleware } from './server.dev'
