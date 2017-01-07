import * as qs from 'querystring'
import * as url from 'url'
import { startsWith } from 'lodash'

import { MountResponse } from './response'
import { BaseRequest } from './request'
import { Middleware } from './middleware'
import { HttpClient, HasHTTPClient } from './http'
import { Transition, stringifyTransition, requestTransition } from './transition'
import { log } from './util'

export interface HasAuthService { auth: AuthService }

export interface AuthOpts {
  startPage: Transition<{}, {}>
  loginPage: Transition<{}, {}>
  loginEndpoint: string
  validationEndpoint: string
  authenticatedUrls: string
}

export interface LoginParams {
  user: string
  pass: string
}


/** Adds oauth support to an application */

export function oauth(config: AuthOpts): Middleware<BaseRequest & HasHTTPClient, HasAuthService & HasHTTPClient> {
  return async (req, next) => {
    const state = await initialAuthState(req.http, config.validationEndpoint)
    const service = new AuthService({
      http: req.http,
      state,
      config,
      refresh: req.refresh,
      location: {
        handler: req.route,
        params: req.pathParams,
        queryParams: req.queryParams
      }
    })

    return next({ auth: service, http: service.authenicatedRequest.bind(service) })
  }
}


/** Ensures that user is logged in, redirecting to login page if not */

export function requiresLogin(): Middleware<HasAuthService, {}> {
  return (req, next) => {
    const { auth } = req

    if (auth.loggedIn()) {
      return next({ auth })

    } else {
      log.trace('Redirecting to login page')

      return Promise.resolve<MountResponse>({
        state: 'redirect',
        status: 401,
        location: auth.loginPagePath()
      })
    }
  }
}


/** Manages login state */

export type AuthState
= { status: 'logged-in', token: string }
| { status: 'logged-out' }

export class AuthService {
  private state: AuthState

  private http: HttpClient
  private config: AuthOpts
  private refresh: () => void
  private location: Transition<{}, {}>

  constructor(opts: { config: AuthOpts, state: AuthState, http: HttpClient, refresh: () => void, location: Transition<{}, {}> }) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_HTTP_CREDENTIALS) {
      throw new Error('$ALLOW_INSECURE_HTTP_CREDENTIALS is not allowed in production')
    }

    this.state = opts.state
    this.http = opts.http
    this.config = opts.config
    this.refresh = opts.refresh
    this.location = opts.location
  }

  loggedIn(): boolean {
    return this.status() === 'logged-in'
  }

  async logOut() {
    this.status() === 'logged-out'
    this.refresh()
  }

  async logIn(credentials: LoginParams) {
    await this.http(this.config.loginEndpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: qs.stringify({
        grant_type: 'password',
        username: credentials.user,
        password: credentials.pass
      }),
    })

    log.trace('Login succeeded')

    requestTransition(this.startPage())
  }

  async authenicatedRequest(address: string, opts: RequestInit = {}): Promise<Response> {
    const privateUrlRoot = url.parse(this.config.authenticatedUrls)
    const requestUrl = url.parse(address)

    if (privateUrlRoot.hostname !== requestUrl.hostname) {
      // Don't authenticate requests to domains that weren't defined as private
      return this.http(address, opts)
    }

    if (privateUrlRoot.path && (!requestUrl.path || !startsWith(requestUrl.path, privateUrlRoot.path))) {
      // Don't authenticate requests to paths that weren't defined as private
      return this.http(address, opts)
    }

    if (requestUrl.protocol !== 'https:' && !process.env.ALLOW_INSECURE_HTTP_CREDENTIALS) {
      throw new Error('Authenticated urls must be explicitly https')
    }

    const { state } = this

    if (state.status === 'logged-in') {
      log.trace('Making authenticated request to ', address)

      const headers = new Headers(opts.headers)
      headers.set('Authorization', 'Bearer ' + state.token)

      return this.http(address, {
        ...opts,
        headers
      })

    } else {
      throw new Error('Authentication required for ' + address)
    }
  }

  startPage() {
    const { queryParams } = this.location

    if (queryParams) {
      const paramPage = queryParams['start']
      if (typeof paramPage === 'string') {
        return paramPage
      }
    }

    return this.config.startPage
  }

  loginPagePath(): Transition<{}, {}> {
    return {
      handler: this.config.loginPage.handler,
      params: this.config.loginPage.params,
      queryParams: { start: stringifyTransition(this.location) }
    }
  }

  private status() {
    return this.state.status
  }
}


/** Confirms that the user is logged in by checking against the validation endpoint */

async function initialAuthState(http: HttpClient, validationEndpoint: string): Promise<AuthState> {
  return { status: 'logged-out' }
}
