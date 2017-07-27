import { DataStream } from '../src'
import { expect } from 'chai'

describe('DataStream', () => {
  it('should drop repeats', async () => {
    const $ = DataStream.of(1, 2, 3, 4)
      .map(x => Math.max(x, 2))

    expect(await $.collect()).to.eql([2, 3, 4])
  })


  describe('.onSubscribe()', () => {
    it('should be called on subscribe', async () => {
      let called = false
      const $ = DataStream.of(1, 2, 3, 4).onSubscribe(() => called = true)

      await $.collect()
      expect(called).to.be.true
    })

    it('not be called until subscribe', async () => {
      let called = false
      DataStream.of(1, 2, 3, 4).onSubscribe(() => called = true)

      expect(called).to.be.false
    })
  })
})
