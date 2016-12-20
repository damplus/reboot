import { expect, assert } from 'chai'
import * as rb from '../src'
import { applyMiddleware } from './helpers'

describe('retryRequests', () => {
  it('should resolve successful requests', async () => {
    const response = await test(Promise.resolve(new Response("1")))
    expect(response).to.eql('1')
  })

  it('should retry failed requests', async () => {
    const response = await test(
      Promise.reject(new Error()),
      Promise.resolve(new Response("2"))
    )

    expect(response).to.eql('2')
  })

  it('should retry 5xx requests', async () => {
    const response = await test(
      Promise.resolve(new Response("", { status: 500 })),
      Promise.resolve(new Response("2"))
    )

    expect(response).to.eql('2')
  })

  it('should not retry 4xx requests', async () => {
    try {
      await test(
        Promise.resolve(new Response("", { status: 404 })),
        Promise.resolve(new Response("2"))
      )

      assert.fail('Expected error')
    } catch (_) {}
  })

  it('should allow at most 4 errors', async () => {
    try {
      await test(
        Promise.reject(new Error()),
        Promise.reject(new Error()),
        Promise.reject(new Error()),
        Promise.reject(new Error()),
        Promise.resolve(new Response("5"))
      )

      assert.fail('Expected error')
    } catch (_) {}
  })

  async function test(...responses: Promise<Response>[]) {
    const responseQueue = responses.slice()
    const middleware = rb.composeMiddleware(
      rb.addStubHttpClient({
        'http://example.com/': {
          get: () => responseQueue.shift()
        }
      }),
      rb.retryRequests()
    )

    const { request } = await applyMiddleware(middleware)
    return request!.http('http://example.com/').then(x => x.text())
  }
})
