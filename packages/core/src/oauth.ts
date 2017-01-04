import { MountResponse } from './response'
import { BaseRequest } from './request'
import { Middleware } from './middleware'
import { HttpClient, HttpError, HasHTTPClient } from './http'
import { Transition, stringifyTransition, requestTransition } from './transition'

export interface HasAuthService { auth: AuthService }
export interface IsLoggedIn { auth: AuthService & { state: 'logged-in' } }

export type AuthState = 'logged-in' | 'logged-out'

export interface AuthOpts {
  startPage: Transition<{}, {}>
  loginPage: Transition<{}, {}>
  loginEndpoint: string
  logoutEndpoint: string
  validationEndpoint: string
}

export interface LoginParams {
  user: string
  pass: string
}


/** Adds oauth support to an application */

export function oauth(config: AuthOpts): Middleware<BaseRequest & HasHTTPClient, HasAuthService> {
  return async (req, next) => {
    const state = await initialAuthState(req.http, config.validationEndpoint)
    return next({
      auth: new AuthService({
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
    })
  }
}


/** Ensures that user is logged in, redirecting to login page if not */

export function requiresLogin(): Middleware<HasAuthService, IsLoggedIn> {
  return (req, next) => {
    const { auth } = req

    if (auth.loggedIn()) {
      return next({ auth })

    } else {
      return Promise.resolve<MountResponse>({
        state: 'redirect',
        status: 401,
        location: auth.loginPagePath()
      })
    }
  }
}


/** Manages login state */

export class AuthService {
  private state: AuthState

  private http: HttpClient
  private config: AuthOpts
  private refresh: () => void
  private location: Transition<{}, {}>

  constructor(opts: { config: AuthOpts, state: AuthState, http: HttpClient, refresh: () => void, location: Transition<{}, {}> }) {
    this.state = opts.state
    this.http = opts.http
    this.config = opts.config
    this.refresh = opts.refresh
    this.location = opts.location
  }

  loggedIn(): this is AuthService & { state: 'logged-in' } {
    return this.state === 'logged-in'
  }

  async logOut() {
    await this.http(this.config.logoutEndpoint)
    this.refresh()
  }

  async logIn(credentials: LoginParams) {
    await this.http(this.config.loginEndpoint)
    requestTransition(this.startPage())
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
}


/** Confirms that the user is logged in by checking against the validation endpoint */

async function initialAuthState(http: HttpClient, validationEndpoint: string): Promise<AuthState> {
  try {
    await http(validationEndpoint)
    return 'logged-in'

  } catch (err) {
    if (err instanceof HttpError) {
      if (err.response.status === 401) {
        return 'logged-out'
      }
    }

    throw err
  }
}
