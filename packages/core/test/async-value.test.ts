import { expect } from 'chai'
import { Stream } from 'xstream'

import * as rb from '../src'
import { collect } from './helpers'

interface Parent { child: string }

describe.only('AsyncValue', () => {
  describe('.waitFor()', () => {
    it('should extract value, skipping pending values', async () => {
      const child$ = asyncStream(loading(), loaded('foo'), loading())
        .compose(rb.AsyncValue.waitFor)

      expect(await collect(child$)).to.eql([
        'foo'
      ])
    })
  })

  describe('.getChild()', () => {
    it('should descend into synchronous child of parent stream', async () => {
      const child$ = asyncStream(loading(), loaded({ child: 'foo' }))
        .compose(rb.AsyncValue.getChild((p: Parent) => Stream.of(p.child)))

      expect(await collect(child$)).to.eql([
        loading(),
        loaded('foo')
      ])
    })

    it('should descend into child pending value of parent stream', async () => {
      const child$ = asyncStream(loading(), loaded({ child: 'foo' }))
        .compose(rb.AsyncValue.getChild((p: Parent) =>
          Stream.of<rb.AsyncValue<string>>(loading(), loaded(p.child)))
        )

      expect(await collect(child$)).to.eql([
        loading(),
        loading(),
        loaded('foo')
      ])
    })
  })
})

function asyncStream<T>(...values: rb.AsyncValue<T>[]): Stream<rb.AsyncValue<T>> {
  return Stream.of(...values)
}

function loading(): rb.MissingAsyncValue {
  return new rb.MissingAsyncValue({ status: 'loading' })
}

function loaded<T>(value: T): rb.PresentAyncValue<T> {
  return new rb.PresentAyncValue({ status: 'loaded', value })
}
