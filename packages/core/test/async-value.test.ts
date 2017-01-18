import { expect } from 'chai'
import * as rb from '../src'

interface Parent { child: string }

describe('AsyncValue', () => {
  describe('.waitFor()', () => {
    it('should extract value, skipping pending values', async () => {
      const child$ = asyncStream(loading(), loaded('foo'), loading())
        .compose(rb.AsyncValue.waitFor)

      expect(await child$.collect()).to.eql([
        'foo'
      ])
    })
  })

  describe('.getChild()', () => {
    it('should descend into synchronous child of parent stream', async () => {
      const child$ = asyncStream(loading(), loaded({ child: 'foo' }))
        .compose(rb.AsyncValue.getChild((p: Parent) => rb.DataStream.of(p.child)))

      expect(await child$.collect()).to.eql([
        loading(),
        loaded('foo')
      ])
    })

    it('should descend into child pending value of parent stream', async () => {
      const child$ = asyncStream(loading(), loaded({ child: 'foo' }))
        .compose(rb.AsyncValue.getChild((p: Parent) =>
          rb.DataStream.of<rb.AsyncValue<string>>(loading(), loaded(p.child)))
        )

      expect(await child$.collect()).to.eql([
        loading(),
        loading(),
        loaded('foo')
      ])
    })
  })
})

function asyncStream<T>(...values: rb.AsyncValue<T>[]): rb.DataStream<rb.AsyncValue<T>> {
  return rb.DataStream.of(...values)
}

function loading(): rb.MissingAsyncValue {
  return new rb.MissingAsyncValue({ status: 'loading' })
}

function loaded<T>(value: T): rb.PresentAyncValue<T> {
  return new rb.PresentAyncValue({ status: 'loaded', value })
}
