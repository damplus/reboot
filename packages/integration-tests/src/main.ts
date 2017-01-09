import * as express from 'express'
import * as path from 'path'
import { Server } from 'http'
import renderMiddleware, { devMiddleware } from 'reboot-server'

export default function main(opts: { production: boolean, buildDir?: string }) {
  return new Promise<Server>(resolve => {
    const server = express()

    if (opts.production) {
      if (!opts.buildDir) throw new Error('opts.buildDir is required')

      server.use(express.static(path.join(opts.buildDir, 'public')))
      server.use(renderMiddleware(path.join(opts.buildDir, 'server')))

    } else {
      server.use(devMiddleware('./src/entrypoints/client'))
    }

    const instance = server.listen(process.env.PORT || 0, () => resolve(instance))
  })
}
