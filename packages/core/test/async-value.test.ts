import { expect } from 'chai'
import * as rb from '../src'

describe('AsyncValue', () => {
  describe('.waitFor()', () => {
    it('should extract value, skipping pending values', async () => {
      const child$ = rb.DataStream.of(
          rb.AsyncValue.loading(),
          rb.AsyncValue.of('foo'),
        )
        .compose(rb.AsyncValue.waitFor)

      expect(await child$.collect()).to.eql([
        'foo'
      ])
    })
  })

  describe('.all()', () => {
    it('should resolve to array when all inputs are resolved', async () => {
      const all = rb.AsyncValue.all([
        rb.AsyncValue.of('a'),
        rb.AsyncValue.of('b')
      ])

      expect(all).to.eql(rb.AsyncValue.of(['a', 'b']))
    })

    it('should resolve to error when an input fails', async () => {
      const all = rb.AsyncValue.all([
        rb.AsyncValue.of('a'),
        rb.AsyncValue.error(new Error('b'))
      ])

      expect(all).to.eql(rb.AsyncValue.error(new Error('b')))
    })

    it('should resolve to pending when an input is loading', async () => {
      const all = rb.AsyncValue.all([
        rb.AsyncValue.of('a'),
        rb.AsyncValue.loading()
      ])

      expect(all).to.eql(rb.AsyncValue.loading())
    })
  })

  describe('.toStream()', () => {
    it('should complete when resolved', async () => {
      const values = await rb.AsyncValue.of('a').toStream().collect()
      expect(values).to.eql(['a'])
    })

    it('should error when an input fails', async () => {
      const res = await rb.AsyncValue.error(new Error('err')).toStream().collect().catch(e => e.message)
      expect(res).to.eql('err')
    })

    it('should resolve to pending when loading', async () => {
      const values = rb.DataStream.merge(
        rb.AsyncValue.loading().toStream(),
        rb.DataStream.of('x')
      )

      expect(await values.take(1).collect()).to.eql(['x'])
    })
  })
})
