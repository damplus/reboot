import { expect } from 'chai'

import * as rb from '../src'
import { applyMiddleware, collect, waitFor } from './helpers'

interface Greeting {
  salutation: string
  object: string
}

const anError = new Error('Boo')

describe('resource middleware', () => {
  context('in initial state', () => {
    async function setup() {
      const { request } = await applyMiddleware(addResource('fooResource'))
      return request!
    }

    describe('fetch', () => {
      it('should load successfuly fetched resource', async () => {
        const request = await setup()

        request!.fooResource.fetch('foo', () => Promise.resolve({ salutation: 'hello', object: 'world' }))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.MissingAsyncValue({ status: 'loading' }),
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' } }),
        ])
      })

      it('should error unsuccessfuly fetched resource', async () => {
        const request = await setup()

        request!.fooResource.fetch('foo', () => Promise.reject(anError))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.MissingAsyncValue({ status: 'loading' }),
          new rb.MissingAsyncValue({ status: 'failed', error: anError }),
        ])
      })
    })
  })

  context('after fetch', () => {
    async function setup() {
      const { request } = await applyMiddleware(addResource('fooResource'))
      request!.fooResource.fetch('foo', () => Promise.resolve({ salutation: 'hello', object: 'world' }))

      await waitFor(request!.fooResource.$('foo'), x => Boolean(x.value))

      return request!
    }

    describe('fetch', () => {
      it('should reload resource', async () => {
        const request = await setup()

        request.fooResource.fetch('foo', () => Promise.resolve({ salutation: 'hello', object: 'friend' }))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' }, reloading: true }),
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'friend' } }),
        ])
      })
    })

    describe('put', () => {
      it('should update resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'put', value: { salutation: 'hello', object: 'friend' } }, () => Promise.resolve())
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'put', value: { salutation: 'hello', object: 'friend' } } }),
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'friend' } }),
        ])
      })

      it('should error unsuccessfuly updated resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'put', value: { salutation: 'hello', object: 'friend' } }, () => Promise.reject(anError))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'put', value: { salutation: 'hello', object: 'friend' } } }),
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' } }),
        ])
      })
    })

    describe('patch', () => {
      it('should update resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'patch', deltaValue: { object: 'friend' } }, () => Promise.resolve())
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'patch', deltaValue: { object: 'friend' } } }),
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'friend' } }),
        ])
      })

      it('should error unsuccessfuly updated resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'patch', deltaValue: { object: 'friend' } }, () => Promise.reject(anError))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'patch', deltaValue: { object: 'friend' } } }),
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' } }),
        ])
      })
    })

    describe('delete', () => {
      it('should delete resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'delete' }, () => Promise.resolve())
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'delete' } }),
          new rb.MissingAsyncValue({ status: 'deleted' }),
        ])
      })

      it('should error unsuccessfuly deleted resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'delete' }, () => Promise.reject(anError))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'delete' } }),
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' } }),
        ])
      })
    })
  })
})

function addResource<Key extends string>(key: Key): rb.Middleware<{}, Record<Key, rb.Resource<Greeting>>> {
  return rb.composeMiddleware(
    rb.createStoreMiddleware(),
    rb.requestProp(key, ({ store }) => new rb.Resource({ key, store })),
  )
}
