import * as React from 'react'
import { render } from 'react-dom'
import { Stream } from 'xstream'
import * as qs from 'querystring'
import { uniqueId, assign } from 'lodash'

import {
  terminalNext,
  MountRequest,
  MountRender,
  createMatcher,
  Route,
  Transition, stringifyTransition, transition$
} from 'reboot-core'

import { toPromise, popState$ } from './util'

export interface MountParams {
  routes: Route<MountRequest>[]
  transitions$: Stream<string>
  path: string
  onTitleChange(title: string): void
  onPushLocation(data: any, title: string, url?: string | null): void
  onReplaceLocation(data: any, title: string, url?: string | null): void
}

export type RouteDeclaration = Route<MountRequest> | (() => Route<MountRequest>)

export default function clientMain(routes: RouteDeclaration[]) {
  return Promise.resolve().then(() =>
    start({
      routes: routes.map(unpackRouteDeclaration),
      transitions$: Stream.merge(popState$, transition$),
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

export function unpackRouteDeclaration(routeDeclaration: RouteDeclaration): Route<MountRequest> {
  return (typeof routeDeclaration === 'function') ? routeDeclaration() : routeDeclaration
}

export function start(params: MountParams): Promise<React.ReactElement<{}>> {
  const matcher = createMatcher<Route<MountRequest>>()
  params.routes.forEach(r => {
    matcher.add([{ path: r.path, handler: r }])
  })

  const matchRoute = (path: string): Transition<{}> => {
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

  const route = matchRoute(params.path)
  const req: MountRequest = {
    environment: 'client',
    route: unpackRouteDeclaration(route.handler),
    pathParams: route.params,
    queryParams: route.queryParams
  }

  return unpackRouteDeclaration(route.handler).middleware(req, terminalNext()).then(response => {
    if (response.state === 'render') {
      if (!response.body) {
        throw new Error('No body declared on route')
      }

      return toPromise(
        response.body.take(1).map(content =>
          <Client
            initialContent={content}
            initialRequest={req}
            initialResponse={response}
            transitions={params.transitions$.map(matchRoute)}
            onTitleChange={params.onTitleChange}
            onPushLocation={params.onPushLocation}
            onReplaceLocation={params.onReplaceLocation}
          />
        )
      )

    } else {
      if (stringifyTransition(response.location) === stringifyTransition(route)) {
        throw new Error(
          `Encountered recursive redirect (${stringifyTransition(route)} => ${stringifyTransition(response.location)})`
        )
      }
      return start(assign({}, params, {
        location: stringifyTransition(response.location)
      }))
    }
  })
}

export interface ClientProps {
  transitions: Stream<Transition<{}>>
  initialRequest: MountRequest
  initialResponse: MountRender
  initialContent?: React.ReactElement<{}>
  onTitleChange(title: string): void
  onPushLocation(data: any, title: string, url?: string | null): void
  onReplaceLocation(data: any, title: string, url?: string | null): void
}

export interface ClientState {
  content: React.ReactElement<{}>
  request: MountRequest
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

  performTransition(target: Transition<{}>, replaceState?: boolean): Promise<void> {
    const request: MountRequest = {
      environment: 'client',
      route: unpackRouteDeclaration(target.handler),
      pathParams: target.params,
      queryParams: target.queryParams
    }
    const transitionID = uniqueId('transition')
    this.transitionID = transitionID

    // Apply the route middleware and set up the route
    return unpackRouteDeclaration(target.handler).middleware(request, terminalNext()).then(response => {
      // Guard against transition races
      if (this.transitionID !== transitionID) return Promise.resolve()

      this.routeWillTransition()
      if (response.state === 'render') {
        if (!response.body) {
          throw new Error('No body declared on route')
        }

        // Perform initial title/content render
        return toPromise(
          Stream.combine(response.body.take(1), response.title.take(1))
        )
        .then((responses) => {
          // Set app state and complete the transition
          const [content, title] = responses

          this.setState({ request, response, content: content || <div/> }, () => Promise.resolve().then(() => {
            if (this.transitionID !== transitionID) return

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
        return this.performTransition(response.location, true)
      }
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
