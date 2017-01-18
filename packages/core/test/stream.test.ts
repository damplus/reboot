import { DataStream } from '../src'
import { expect } from 'chai'

describe('DataStream', () => {
  it('should drop repeats', async () => {
    const $ = DataStream.of(1, 2, 3, 4)
      .map(x => Math.max(x, 2))

    expect(await $.collect()).to.eql([2, 3, 4])
  })
})
