import { Listener } from 'xstream'
import * as rb from '../src'

export function createTestRequest(): rb.MountRequest {
  return {
    environment: 'client',
    pathParams: {},
    queryParams: {},
    route: new rb.Route({ middleware: rb.noopMiddleware(), path: '/' })
  }
}

export async function applyMiddleware<Rs>(m: rb.Middleware<rb.MountRequest, Rs>) {
  let request: Rs | undefined
  const response = await m(createTestRequest(), async (req) => {
    request = req
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