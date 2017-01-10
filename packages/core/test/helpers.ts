import { Listener, Stream } from 'xstream'
import { assign } from 'lodash'

import * as rb from '../src'
import { toPromise } from '../src/util'

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

export function collect<T>(stream: Stream<T>): Promise<T[]> {
  return toPromise(stream.fold<T[]>((prev, x) => [...prev, x], []).last())
}

export function waitFor<T>(s: Stream<T>, cond: (x: T) => boolean) {
  return toPromise(s.filter(cond).take(1))
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

export class StreamCollector<T> implements Listener<T> {
  nexts: T[] = []
  completed = false
  failure?: Error

  next(x: T) {
    this.nexts.push(x)
  }

  complete() {
    this.completed = true
  }

  error(x: Error) {
    this.failure = x
  }
}