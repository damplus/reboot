import * as path from 'path'
import { assign } from 'lodash'

import { BaseRequest } from './request'
import { MountResponse } from './response'
import { Middleware, compose, noop } from './middleware'
import { requestProp } from './middlewares.request'
import { RenderFn, render, renderTitle } from './middlewares.rendering'
import { Transition } from './transition'

export interface RouteProps<Input extends BaseRequest, AddedProps> {
  path: string
  middleware: Middleware<Input, AddedProps>
  parent: RequestTransformer<Input>
}

export interface RouteWithParams<P> extends Route<BaseRequest & HasParams<P>, {}> {}

export interface HasParams<P> {
  location: Transition<P, P>
}

export interface RequestTransformer<Result extends BaseRequest> {
  apply(req: BaseRequest, cb: (next: Result, parents: BoundRoute[]) => Promise<MountResponse>): Promise<MountResponse>
}

export class Route<Input extends BaseRequest, AddedProps> implements RequestTransformer<Input & AddedProps> {
  private props: RouteProps<Input, AddedProps>

  constructor(props: RouteProps<Input, AddedProps>) {
    this.props = props
  }

  get path() {
    return this.props.path
  }

  use<ExtraProps>(m: Middleware<Input & AddedProps, ExtraProps>) {
    return new Route<Input, ExtraProps & AddedProps>({
      path: this.path,
      middleware: compose(this.props.middleware, m),
      parent: this.props.parent
    })
  }

  add<Key extends string, T>(key: Key, Class: new (props: Input & AddedProps) => T) {
    return this.use(
      requestProp(key, (req: Input & AddedProps) => new Class(req))
    )
  }

  render(element: React.ReactElement<{}> | RenderFn<Input & AddedProps, React.ReactElement<{}>>) {
    return this.use(
      render(typeof element === 'function' ? element : () => element)
    )
  }

  title(title: string | RenderFn<Input & AddedProps, string>) {
    return this.use(
      renderTitle(typeof title === 'function' ? title : () => title)
    )
  }

  subroute(subpath: string): Route<Input & AddedProps, {}>
  subroute<ParamKeys extends string>(subpath: string, ...paramKeys: ParamKeys[]): Route<Input & AddedProps & HasParams<Record<ParamKeys, string>>, {}>
  subroute(subpath: string) {
    return new Route({
      path: path.join(this.path, subpath),
      middleware: noop(),
      parent: this
    })
  }

  apply(startReq: BaseRequest, next: (props: Input & AddedProps, parents: BoundRoute[]) => Promise<MountResponse>): Promise<MountResponse> {
    return this.props.parent.apply(startReq, (prevReq, parents) =>
      this.props.middleware(prevReq, addedProps => {
        const nextReq = assign({}, prevReq, addedProps)
        return next(nextReq, [...parents, { route: this, request: nextReq }])
      })
    )
  }
}

export interface BoundRoute {
  route: AnyRoute
  request: BaseRequest
}

export type AnyRoute = Route<BaseRequest, {}>

export function app(basePath: string = '') {
  let route = new Route({
    path: basePath,
    middleware: noop(),
    parent: {
      apply: (req, cb) => cb(req, [])
    }
  })
  return route
}
