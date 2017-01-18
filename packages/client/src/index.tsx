import * as React from 'react'
import { render } from 'react-dom'
import { DataStream } from 'reboot-core'
import * as qs from 'querystring'
import { uniqueId } from 'lodash'

import {
  terminalNext,
  BaseRequest,
  MountRender,
  createMatcher,
  AnyRoute,
  Transition, stringifyTransition, transition$,
  Store, createStore
} from 'reboot-core'

import { popState$, log } from './util'

export interface MountParams {
  routes: AnyRoute[]
  transitions$: DataStream<string>
  path: string
  onTitleChange: (title: string) => void
  onPushLocation: (data: any, title: string, url?: string | null) => void
  onReplaceLocation: (data: any, title: string, url?: string | null) => void
}

export type RouteDeclaration = AnyRoute | (() => AnyRoute)

export default function clientMain(routes: RouteDeclaration[]) {
  return Promise.resolve().then(() =>
    start({
      routes: routes.map(unpackRouteDeclaration),
      transitions$: DataStream.merge(popState$, transition$),
      onPushLocation: history.pushState.bind(history),
      onReplaceLocation: history.replaceState.bind(history),
      onTitleChange: title => { document.title = title },
      path: window.location.pathname + window.location.search
    })
  )
  .then(el => render(el, document.getElementById('app')))
  .catch(err => {
    if (process.env.NODE_ENV !== 'production') {
      render(<div>{err.message}</div>, document.getElementById('app'))

    } else {
      Promise.reject(err)
    }
  })
}

export function unpackRouteDeclaration(routeDeclaration: RouteDeclaration): AnyRoute {
  return (typeof routeDeclaration === 'function') ? routeDeclaration() : routeDeclaration
}

export function start(params: MountParams): Promise<React.ReactElement<{}>> {
  const matcher = createMatcher<AnyRoute>()
  params.routes.forEach(r => {
    matcher.add([{ path: r.path, handler: r }])
  })

  const matchRoute = (path: string): Transition<{}, {}> => {
    const route = (matcher.recognize(path) || [])[0]
    if (!route) {
      throw new Error(`Could not match ${path}`)
    }
    const query = path.indexOf('?')

    return {
      handler: route.handler,
      params: route.params,
      queryParams: (query >= 0) ? qs.parse(path.substr(query)) : undefined
    }
  }

  const store = createStore()
  const location = matchRoute(params.path)
  const req: BaseRequest = { location, store }
  log.trace('matched initial route', stringifyTransition(location))

  return unpackRouteDeclaration(location.handler).apply(req, terminalNext()).then(response => {
    if (response.state === 'render') {
      log.trace('performing initial render')

      if (!response.body) {
        throw new Error('No body declared on route')
      }

      return response.body
        .take(1)
        .map(content =>
          <Client
            store={store}
            initialContent={content}
            initialRequest={req}
            initialResponse={response}
            transitions={params.transitions$.map(matchRoute)}
            onTitleChange={params.onTitleChange}
            onPushLocation={params.onPushLocation}
            onReplaceLocation={params.onReplaceLocation}
          />
        )
        .first()

    } else {
      const path = stringifyTransition(response.location)
      log.trace('redirecting initial page ->', path)

      if (params.path === path) {
        throw new Error(
          `Encountered recursive redirect (${path} => ${stringifyTransition(response.location)})`
        )
      }

      return start({
        ...params,
        path
      })
    }
  })
}

export interface ClientProps {
  store: Store<{}>
  transitions: DataStream<Transition<{}, {}>>
  initialRequest: BaseRequest
  initialResponse: MountRender
  initialContent?: React.ReactElement<{}>
  onTitleChange(title: string): void
  onPushLocation(data: any, title: string, url?: string | null): void
  onReplaceLocation(data: any, title: string, url?: string | null): void
}

export interface ClientState {
  content: React.ReactElement<{}>
  request: BaseRequest
  response: MountRender
}

export class Client extends React.Component<ClientProps, ClientState> {
  state: ClientState = {
    content: this.props.initialContent || <div />,
    request: this.props.initialRequest,
    response: this.props.initialResponse
  }

  transitionID?: string

  renderListener = {
    next: (content: React.ReactElement<{}>) => {
      const { request, response } = this.state
      this.setState({ request, response, content })
    },
    complete: () => {},
    error: () => {},
  }

  transitionListener = {
    next: this.performTransition.bind(this),
    complete: () => {},
    error: () => {},
  }

  titleListener = {
    next: this.props.onTitleChange,
    complete: () => {},
    error: () => {},
  }

  componentDidMount() {
    this.routeDidTransition()
    this.props.transitions.addListener(this.transitionListener)
  }

  componentWillUnmount() {
    this.routeWillTransition()
    this.props.transitions.removeListener(this.transitionListener)
  }

  performTransition(target: Transition<{}, {}>, replaceState?: boolean): Promise<void> {
    const address = stringifyTransition(target)
    log.trace('received transition request', address, 'replaceState = ', replaceState)

    const request: BaseRequest = {
      location: target,
      store: this.props.store
    }
    const transitionID = uniqueId('transition')
    this.transitionID = transitionID

    // Apply the route middleware and set up the route
    return unpackRouteDeclaration(target.handler).apply(request, terminalNext()).then(response => {
      // Guard against transition races
      if (this.transitionID !== transitionID) return Promise.resolve()
      log.trace('mounted route', address, 'waiting for rendering to complete...')

      this.routeWillTransition()
      if (response.state === 'render') {
        if (!response.body) {
          throw new Error('No body declared on route')
        }

        // Perform initial title/content render
        return DataStream
          .combine(response.body.take(1), response.title.take(1))
          .first()
          .then(([content, title]) => {
            log.trace('render completed for route', address)

            this.setState({ request, response, content: content || <div/> }, () => Promise.resolve().then(() => {
              log.trace('transition complete for route', address)

              if (this.transitionID !== transitionID) {
                log.trace('(ignoring due to transition race)')
                return
              }

              this.transitionID = undefined
              this.routeDidTransition()

              if (replaceState) {
                this.props.onReplaceLocation(undefined, title, stringifyTransition(target))

              } else {
                this.props.onPushLocation(undefined, title, stringifyTransition(target))
              }
            }))
          })

        } else {
          log.trace('redirect', address, '->', stringifyTransition(response.location))
          return this.performTransition(response.location, true)
        }
      })
      .catch(err => {
        log.trace('transition failed for route', address, 'with error', err)
        return Promise.reject(err)
      })
  }

  routeWillTransition() {
    const { body, title } = this.state.response

    if (body) body.removeListener(this.renderListener)
    title.removeListener(this.titleListener)
  }

  routeDidTransition() {
    const { body, title } = this.state.response

    if (body) body.addListener(this.renderListener)
    title.addListener(this.titleListener)
  }

  render() {
    return this.state.content
  }
}
