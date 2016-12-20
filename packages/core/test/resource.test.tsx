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
          { status: 'loading' },
          { status: 'loaded', value: { salutation: 'hello', object: 'world' } },
        ])
      })

      it('should error unsuccessfuly fetched resource', async () => {
        const request = await setup()

        request!.fooResource.fetch('foo', () => Promise.reject(anError))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          { status: 'loading' },
          { status: 'failed', error: anError },
        ])
      })
    })
  })

  context('after fetch', () => {
    async function setup() {
      const { request } = await applyMiddleware(addResource('fooResource'))
      request!.fooResource.fetch('foo', () => Promise.resolve({ salutation: 'hello', object: 'world' }))

      await waitFor(request!.fooResource.$('foo'), x => Boolean(x && x.status === 'loaded'))

      return request!
    }

    describe('fetch', () => {
      it('should reload resource', async () => {
        const request = await setup()

        request.fooResource.fetch('foo', () => Promise.resolve({ salutation: 'hello', object: 'friend' }))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          { status: 'loaded', value: { salutation: 'hello', object: 'world' }, reloading: true },
          { status: 'loaded', value: { salutation: 'hello', object: 'friend' } },
        ])
      })

      it('should error unsuccessfuly fetched resource', async () => {
        const request = await setup()

        request.fooResource.fetch('foo', () => Promise.reject(anError))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          { status: 'loaded', value: { salutation: 'hello', object: 'world' }, reloading: true },
          { status: 'loaded', value: { salutation: 'hello', object: 'world' }, error: anError },
        ])
      })
    })

    describe('put', () => {
      it('should update resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'put', value: { salutation: 'hello', object: 'friend' } }, () => Promise.resolve())
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          { status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'put', value: { salutation: 'hello', object: 'friend' } } },
          { status: 'loaded', value: { salutation: 'hello', object: 'friend' } },
        ])
      })

      it('should error unsuccessfuly updated resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'put', value: { salutation: 'hello', object: 'friend' } }, () => Promise.reject(anError))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          { status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'put', value: { salutation: 'hello', object: 'friend' } } },
          { status: 'loaded', value: { salutation: 'hello', object: 'world' } },
        ])
      })
    })

    describe('patch', () => {
      it('should update resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'patch', value: { object: 'friend' } }, () => Promise.resolve())
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          { status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'patch', value: { object: 'friend' } } },
          { status: 'loaded', value: { salutation: 'hello', object: 'friend' } },
        ])
      })

      it('should error unsuccessfuly updated resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'patch', value: { object: 'friend' } }, () => Promise.reject(anError))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          { status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'patch', value: { object: 'friend' } } },
          { status: 'loaded', value: { salutation: 'hello', object: 'world' } },
        ])
      })
    })

    describe('delete', () => {
      it('should delete resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'delete' }, () => Promise.resolve())
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          { status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'delete' } },
          { status: 'deleted' },
        ])
      })

      it('should error unsuccessfuly deleted resource', async () => {
        const request = await setup()

        request.fooResource.mutate('foo', { type: 'delete' }, () => Promise.reject(anError))
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          { status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'delete' } },
          { status: 'loaded', value: { salutation: 'hello', object: 'world' } },
        ])
      })
    })
  })
})

function addResource<Key extends string>(key: Key): rb.Middleware<{}, Record<Key, rb.Resource<Greeting>>> {
  return rb.composeMiddleware(
    rb.addStore(),
    rb.requestProp(key, ({ store }) => new rb.Resource({ key, store })),
  )
}
