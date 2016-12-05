import { Middleware } from './middleware'
import { requestProp } from './middlewares.request'

export interface HttpClient {
  (url: string, opts?: RequestInit): Promise<Response>
}

export interface HasHTTPClient {
  http: HttpClient
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
    const message = await r.text()
    throw new Error(message)

  } else {
    return r
  }
}


/** Stub Client */

export interface StubbedEndpoints {
  [url: string]: {
    [method: string]: StubbedEndpointResponse
  }
}

export type StubbedEndpointResponse
= {}
| Response
| ((x: {}) => StubbedEndpointResponse | undefined)

export function addStubHttpClient(stubs: StubbedEndpoints): Middleware<{}, HasHTTPClient> {
  return requestProp('http', () => stubClient(stubs))
}

function stubClient(stubs: StubbedEndpoints): HttpClient {
  return (url, opts) => {
    const method = (opts && opts.method || 'get').toLowerCase()
    const stub = (stubs[url] || {})[method]

    return convertStubResponse(stub, opts && opts.body)
  }
}

function convertStubResponse(stub?: StubbedEndpointResponse, body?: {}): Promise<Response> {
  if (!stub) {
    return Promise.resolve(new Response(undefined, { status: 404 }))

  } else if (typeof stub === 'function') {
    return convertStubResponse(stub(tryConvertJSON(body)), body)

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
