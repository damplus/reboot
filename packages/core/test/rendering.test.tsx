import * as React from 'react'
import { expect } from 'chai'

import * as rb from '../src'
import { applyMiddleware } from './helpers'

describe('render middlewares', () => {
  it('should render constant element', async () => {
    const { body } = await applyRenderMiddleware(rb.render(<div>Hello</div>))
    expect(body).to.eql([<div>Hello</div>])
  })

  it('should render constant render function', async () => {
    const { body } = await applyRenderMiddleware(rb.render(() => <div>Hello</div>))
    expect(body).to.eql([<div>Hello</div>])
  })

  it('should render streaming render function', async () => {
    const { body } = await applyRenderMiddleware(rb.render(() => rb.DataStream.of(<div>1</div>, <div>2</div>)))
    expect(body).to.eql([<div>1</div>, <div>2</div>])
  })

  it('should use latest render middleware in middleware chain', async () => {
    const { body } = await applyRenderMiddleware(
      rb.composeMiddleware(
        rb.render(<div>1</div>),
        rb.render(<div>2</div>)
      )
    )

    expect(body).to.eql([<div>2</div>])
  })

  it('should render container', async () => {
    const { body } = await applyRenderMiddleware(
      rb.composeMiddleware(
        rb.renderContainer(<div/>),
        rb.render(<h1>Hello</h1>)
      )
    )

    expect(body).to.eql([<div><h1>Hello</h1></div>])
  })

  it('should render title', async () => {
    const { title } = await applyRenderMiddleware(
      rb.renderTitle('Hello')
    )

    expect(title).to.eql(['Hello'])
  })
})

async function applyRenderMiddleware(m: rb.Middleware<{}, {}>) {
  const { response } = await applyMiddleware(m)
  expect(response.state).to.eql('render')

  const render = (response as rb.MountRender)
  return {
    body: await (render.body || rb.DataStream.empty()).collect(),
    title: await (render.title || rb.DataStream.empty()).collect()
  }
}
