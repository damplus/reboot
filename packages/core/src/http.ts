import { Middleware } from './middleware'
import { requestProp } from './middlewares.request'

export interface HttpClient {
  (url: string, opts?: RequestInit): Promise<Response>
}

export interface HasHTTPClient {
  http: HttpClient
}

export class HttpError implements Error {
  response: Response
  name: string
  message: string

  constructor(response: Response) {
    this.name = 'HttpError'
    this.message = response.statusText
    this.response = response
  }
}


/** Real Client */

export function addHttpClient(): Middleware<{}, HasHTTPClient> {
  return requestProp('http', () => http)
}

function http(url: string, opts?: RequestInit): Promise<Response> {
  return fetch(url, opts).then(validateStatus)
}

async function validateStatus(r: Response): Promise<Response> {
  if (r.status >= 300) {
    throw new HttpError(r)

  } else {
    return r
  }
}


/**
 * Adapts the http client to retry failed requests or 5xx status responses up to 4 times
 * with exponential backoff
 */
export function retryRequests(): Middleware<HasHTTPClient, HasHTTPClient> {
  return requestProp('http', ({ http }) => adaptClient(http))

  function adaptClient(http: HttpClient): HttpClient {
    return (url, opts) => fetchWithBackoff(url, opts)

    async function fetchWithBackoff(url: string, opts?: RequestInit, attempt: number = 1): Promise<Response> {
      try {
        return await http(url, opts)

      } catch (e) {
        if (e instanceof HttpError && e.response.status < 500) {
          throw e
        }

        if (attempt < 5) {
          await milliseconds(Math.pow(Math.random() * 5, attempt))
          return fetchWithBackoff(url, opts, attempt + 1)

        } else {
          throw e
        }
      }

      function milliseconds(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms))
      }
    }
  }
}


/** Stub Client */

export interface StubbedEndpoints {
  [url: string]: {
    [method: string]: any
  }
}

export function addStubHttpClient(stubs: StubbedEndpoints): Middleware<{}, HasHTTPClient> {
  return requestProp('http', () => stubClient(stubs))
}

function stubClient(stubs: StubbedEndpoints): HttpClient {
  return (url, opts) => {
    const method = (opts && opts.method || 'get').toLowerCase()
    const stub = (stubs[url] || {})[method]

    return convertStubResponse(stub, opts && opts.body).then(validateStatus)
  }
}

function convertStubResponse(stub?: any, body?: {}): Promise<Response> {
  if (!stub) {
    return Promise.resolve(new Response(undefined, { status: 404 }))

  } else if (typeof stub === 'function') {
    return convertStubResponse(stub(tryConvertJSON(body)), body)

  } else if (typeof stub.then === 'function') {
    return stub.then((x: any) => convertStubResponse(x, body))

  } else if (stub instanceof Response) {
    return Promise.resolve(stub)

  } else {
    return Promise.resolve(new Response(JSON.stringify(stub), { status: 200 }))
  }
}

function tryConvertJSON(json?: any) {
  try {
    return json && JSON.parse(json)

  } catch (err) {
    return json
  }
}
