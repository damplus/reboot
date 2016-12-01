import { expect } from 'chai'
import { Action } from 'redux'

import * as rb from '../src'
import { applyMiddleware, StreamCollector } from './helpers'

describe('redux middleware', () => {
  it('should add store to requests', async () => {
    const m = await applyMiddleware(rb.addStore())
    expect(m.request!.store).to.exist
  })

  it('should dispatch actions and subscribe to store changed events', async () => {
    const { request } = await applyMiddleware(rb.composeMiddleware(
      rb.addStore(),
      rb.addReducer('counter', (x: number = 0, action: Action) => {
        if (action.type === 'increment') return x + 1
        else return x
      })
    ))

    const listener = new StreamCollector<number>()
    request!.store.select$(x => x.counter).subscribe(listener)

    request!.store.dispatch({ type: 'increment' })
    expect(listener.nexts).to.eql([0, 1])

    request!.store.select$(x => x.counter).removeListener(listener)
  })
})
