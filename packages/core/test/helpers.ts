import { assign } from 'lodash'

import * as rb from '../src'

export function createTestRequest(): rb.BaseRequest {
  return {
    location: {
      handler: new rb.Route({
        middleware: rb.noopMiddleware(),
        path: '/',
        parent: {
          apply: rb.noopMiddleware()
        }
      }),
      params: {}
    },
    store: rb.createStore()
  }
}

export async function applyMiddleware<Rs>(m: rb.Middleware<rb.BaseRequest, Rs>) {
  let request: (rb.BaseRequest & Rs) | undefined
  const startReq = createTestRequest()

  const response = await m(startReq, async (props) => {
    request = assign(startReq, props)
    return rb.defaultResponse()
  })

  return { request, response }
}
