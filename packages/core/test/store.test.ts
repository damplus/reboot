import { expect } from 'chai'
import { Action } from 'redux'

import * as rb from '../src'
import { applyMiddleware } from './helpers'

describe('store', () => {
  it('should dispatch actions and subscribe to store changed events', async () => {
    const { request } = await applyMiddleware(
      rb.addReducer('counter', (x: number = 0, action: Action) => {
        if (action.type === 'increment') return x + 1
        else return x
      })
    )

    const changes = request!.store.select$((x: { counter: number }) => x.counter).take(2).collect()

    request!.store.dispatch({ type: 'increment' })
    expect(await changes).to.eql([0, 1])
  })
})
