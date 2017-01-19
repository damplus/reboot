import * as qs from 'querystring'
import * as url from 'url'
import { startsWith } from 'lodash'
import { Reducer } from 'redux'

import { MountResponse } from './response'
import { BaseRequest, Cookies } from './request'
import { Middleware } from './middleware'
import { Store } from './store'
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

export interface LoginResponse {
	access_token: string;
	refresh_token: string;
	token_type: string;
	expires_in: number;
}

/** Adds oauth support to an application */

export function oauth(config: AuthOpts): Middleware<BaseRequest & HasHTTPClient, HasAuthService & HasHTTPClient> {
  return async (req, next) => {
    const state = await initialAuthState(req.http, config.loginEndpoint, req.cookies)
    const store = req.store.addReducer('oauth', authStateReducer(state))

    const service = new AuthService({
      http: req.http,
      store,
      config,
      location: req.location,
      cookies: req.cookies
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
= { status: 'logged-in', token: string, refresh: string }
| { status: 'logged-out' }

export class AuthService {
  private http: HttpClient
  private config: AuthOpts
  private location: Transition<{}, {}>
  private store: Store<HasAuthState>
  private cookies: Cookies

  constructor(opts: { config: AuthOpts, store: Store<HasAuthState>, http: HttpClient, location: Transition<{}, {}>, cookies: Cookies }) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_HTTP_CREDENTIALS) {
      throw new Error('$ALLOW_INSECURE_HTTP_CREDENTIALS is not allowed in production')
    }

    this.store = opts.store
    this.http = opts.http
    this.config = opts.config
    this.location = opts.location
    this.cookies = opts.cookies
  }

  loggedIn(): boolean {
    return this.status() === 'logged-in'
  }

  async logOut() {
    this.store.dispatch<AuthStateAction>({ type: 'auth.logout' })
    this.cookies.delete(REFRESH_COOKIE_KEY)
  }

  async logIn(credentials: LoginParams) {
    const response = await this.http(this.config.loginEndpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: qs.stringify({
        grant_type: 'password',
        username: credentials.user,
        password: credentials.pass
      }),
    }).then<LoginResponse>(r => r.json())

    log.trace('Login succeeded')

    this.store.dispatch<AuthStateAction>({ type: 'auth.login', credentials: response })
    this.cookies.set(REFRESH_COOKIE_KEY, response.refresh_token)

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

    const state = this.state()

    if (state.status === 'logged-in') {
      log.trace('Making authenticated request to ', address)

      const headers = new Headers(opts.headers || {})
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

  private state() {
    return this.store.getState().oauth
  }

  private status() {
    return this.state().status
  }
}


/** Confirms that the user is logged in by checking against the validation endpoint */

async function initialAuthState(http: HttpClient, loginEndpoint: string, cookies: Cookies): Promise<AuthState> {
  const refresh_token = cookies.get(REFRESH_COOKIE_KEY)

  if (refresh_token) {
    try {
      log.trace('Found a refresh token. Validating it...')

      const { access_token } = await http(loginEndpoint, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' }),
        body: qs.stringify({
          grant_type: 'refresh_token',
          refresh_token
        }),
      }).then<LoginResponse>(r => r.json())

      log.trace('Token is valid. Entering route in logged-in state')
      return { status: 'logged-in', token: access_token, refresh: refresh_token }

    } catch (err) {
      log.trace('Token is not valid')
    }
  }

  log.trace('Entering route in logged-out state')
  return { status: 'logged-out' }
}


/** State management */

export interface HasAuthState {
  oauth: AuthState
}

export type AuthStateAction
= { type: 'auth.login', credentials: LoginResponse }
| { type: 'auth.logout'}

export function authStateReducer(initialState: AuthState): Reducer<AuthState> {
  return function reduceAuthState(prev: AuthState = initialState, action: AuthStateAction | { type: '' }): AuthState {
    if (action.type === 'auth.login') {
      return { status: 'logged-in', token: action.credentials.access_token, refresh: action.credentials.refresh_token }

    } else if (action.type === 'auth.logout') {
      return { status: 'logged-out' }
    }

    return prev
  }
}

const REFRESH_COOKIE_KEY = 'reboot.app.auth'
