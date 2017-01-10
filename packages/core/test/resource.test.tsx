import { expect } from 'chai'

import * as rb from '../src'
import { applyMiddleware, collect } from './helpers'

interface Greeting {
  salutation: string
  object: string
}

const anError = new Error('Boo')

describe('Resource', () => {
  context('in initial state', () => {
    async function setup(fn: () => Promise<Greeting>) {
      const { request } = await applyMiddleware(addResource('fooResource', fn))
      return request!
    }

    it('should load successfuly fetched resource', async () => {
      const request = await setup(() => Promise.resolve({ salutation: 'hello', object: 'world' }))
      const events = await collect(request!.fooResource.$('foo').take(2))

      expect(events).to.eql([
        new rb.MissingAsyncValue({ status: 'loading' }),
        new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' } }),
      ])
    })

    it('should error unsuccessfuly fetched resource', async () => {
      const request = await setup(() => Promise.reject(anError))
      const events = await collect(request!.fooResource.$('foo').take(2))

      expect(events).to.eql([
        new rb.MissingAsyncValue({ status: 'loading' }),
        new rb.MissingAsyncValue({ status: 'failed', error: anError }),
      ])
    })

    describe('put', () => {
      it('should update resource', async () => {
        const request = await setup(() => Promise.resolve({ salutation: 'hello', object: 'world' }))
        await request.fooResource.fetch('foo')

        request.fooResource.mutate('foo', { type: 'put', value: { salutation: 'hello', object: 'friend' } }, () => Promise.resolve())
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'put', value: { salutation: 'hello', object: 'friend' } } }),
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'friend' } }),
        ])
      })

      it('should revert unsuccessfuly updated resource', async () => {
        const request = await setup(() => Promise.resolve({ salutation: 'hello', object: 'world' }))
        await request.fooResource.fetch('foo')

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
        const request = await setup(() => Promise.resolve({ salutation: 'hello', object: 'world' }))
        await request.fooResource.fetch('foo')

        request.fooResource.mutate('foo', { type: 'patch', deltaValue: { object: 'friend' } }, () => Promise.resolve())
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'patch', deltaValue: { object: 'friend' } } }),
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'friend' } }),
        ])
      })

      it('should error unsuccessfuly updated resource', async () => {
        const request = await setup(() => Promise.resolve({ salutation: 'hello', object: 'world' }))
        await request.fooResource.fetch('foo')

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
        const request = await setup(() => Promise.resolve({ salutation: 'hello', object: 'world' }))
        await request.fooResource.fetch('foo')

        request.fooResource.mutate('foo', { type: 'delete' }, () => Promise.resolve())
        const events = await collect(request!.fooResource.$('foo').take(2))

        expect(events).to.eql([
          new rb.PresentAyncValue({ status: 'loaded', value: { salutation: 'hello', object: 'world' }, mutation: { type: 'delete' } }),
          new rb.MissingAsyncValue({ status: 'deleted' }),
        ])
      })

      it('should revert unsuccessfuly deleted resource', async () => {
        const request = await setup(() => Promise.resolve({ salutation: 'hello', object: 'world' }))
        await request.fooResource.fetch('foo')

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

function addResource<Key extends string>(key: Key, fetch: (id: string) => Promise<Greeting>): rb.Middleware<{}, Record<Key, rb.Resource<Greeting>>> {
  return rb.requestProp(key, ({ store }) => new rb.Resource({ key, store, fetch }))
}
