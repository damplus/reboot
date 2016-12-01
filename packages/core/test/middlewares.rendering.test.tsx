import * as React from 'react'
import { expect } from 'chai'
import { Stream } from 'xstream'

import * as rb from '../src'
import { applyMiddleware, StreamCollector } from './helpers'

describe('render middleware', () => {
  it('should render constant element', async () => {
    const { body } = await applyRenderMiddleware(rb.render(<div>Hello</div>))
    expect(body).to.eql([<div>Hello</div>])
  })

  it('should render constant render function', async () => {
    const { body } = await applyRenderMiddleware(rb.render(() => <div>Hello</div>))
    expect(body).to.eql([<div>Hello</div>])
  })

  it('should render streaming render function', async () => {
    const { body } = await applyRenderMiddleware(rb.render(() => Stream.of(<div>1</div>, <div>2</div>)))
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

  const body = new StreamCollector<React.ReactElement<{}>>()
  const title = new StreamCollector<string>()

  const render = (response as rb.MountRender)
  if (render.body) render.body.subscribe(body)
  if (render.title) render.title.subscribe(title)

  return { body: body.nexts, title: title.nexts }
}
