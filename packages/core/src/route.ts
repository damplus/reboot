import { assign } from 'lodash'
import * as path from 'path'

import { BaseRequest } from './request'
import { Middleware, compose, noop } from './middleware'
import { requestProp } from './middlewares.request'
import { RenderFn, render, renderTitle } from './middlewares.rendering'

export interface RouteProps<R extends BaseRequest> {
  path: string
  middleware: Middleware<BaseRequest, R>
}

export interface RouteWithParams<P> extends Route<BaseRequest & { pathParams: P }> {}

export class Route<R extends BaseRequest> implements RouteProps<R> {
  path: string
  middleware: Middleware<BaseRequest, R>

  constructor(props: RouteProps<R>) {
    assign(this, props)
  }

  use<R2>(m: Middleware<R, R2>) {
    return new Route<R & R2>({
      path: this.path,
      middleware: compose(this.middleware, m)
    })
  }

  add<Key extends string, T>(key: Key, Class: new (props: R) => T): Route<R & Record<Key, T>> {
    return this.use(
      requestProp(key, (req: R) => new Class(req))
    )
  }

  render(element: React.ReactElement<{}> | RenderFn<R, React.ReactElement<{}>>): Route<R> {
    return this.use(
      render(typeof element === 'function' ? element : () => element)
    )
  }

  title(title: string | RenderFn<R, string>): Route<R> {
    return this.use(
      renderTitle(typeof title === 'function' ? title : () => title)
    )
  }

  subroute(subpath: string): Route<R>
  subroute<ParamKeys extends string>(subpath: string, ...paramKeys: ParamKeys[]): Route<R & { pathParams: Record<ParamKeys, string> }>
  subroute(subpath: string): Route<any> {
    return new Route({
      path: path.join(this.path, subpath),
      middleware: this.middleware
    })
  }
}

export function app(basePath: string = '') {
  return new Route({
    path: basePath,
    middleware: noop()
  })
}
