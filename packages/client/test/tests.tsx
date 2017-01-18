import * as React from 'react'
import { expect } from 'chai'
import { DataStream } from 'reboot-core'
import { assign } from 'lodash'
import * as lib from 'reboot-core'
import { mount, ReactWrapper } from 'enzyme'

import { start } from '../src'

describe('client', () => {
  let client: ReactWrapper<any, any>
  afterEach(() => client.unmount())

  it('should render route content', async () => {
    const { stream, listener } = DataStream.createWithTestListener<React.ReactElement<{}>>()
    listener.next(<div>1</div>)

    client = await createClientRenderer({
      path: '/',
      routes: [
        createRoute('/', lib.render(() => stream))
      ]
    })

    expect(client.render()).to.have.text('1')

    listener.next(<div>2</div>)
    expect(client.render()).to.have.text('2')
  })

  it('should render route title', async () => {
    const { stream, listener } = DataStream.createWithTestListener<string>()
    let title

    listener.next('1')

    client = await createClientRenderer({
      path: '/',
      routes: [
        createRoute('/',
          lib.composeMiddleware(
            lib.renderTitle(() => stream),
            lib.render(<span />)
          )
        )
      ],
      onTitleChange: t => title = t
    })
    client.render()
    expect(title).to.eql('1')

    listener.next('2')
    expect(title).to.eql('2')
  })

  it('should push location on transition', async () => {
    const { stream, listener } = DataStream.createWithTestListener<string>()
    const transitions = DataStream.createWithTestListener<{ title: string, path: string }>()

    const target = createRoute(
      '/link-target',
      () => Promise.resolve<lib.MountRender>({
        body: DataStream.of(<div />),
        title: DataStream.of('Target Page'),
        state: 'render'
      })
    )

    client = await createClientRenderer({
      path: '/',
      routes: [
        createRoute('/', lib.render(() => <div />)),
        target
      ],
      transitions$: stream,
      onPushLocation: (target, title, path) => {
        transitions.listener.next({ title, path })
      }
    })

    listener.next('/link-target')

    expect(await transitions.stream.first()).to.eql(
      { title: 'Target Page', path: '/link-target' }
    )
  })

  it('should avoid transition races')
})


interface RendererParams {
  routes: lib.Route<lib.BaseRequest, {}>[]
  path: string

  transitions$?: DataStream<string>
  onTitleChange?: (title: string) => void
  onPushLocation?: (location: lib.Transition<{}, {}>, title: string, url: string) => void
  onReplaceLocation?: (location: lib.Transition<{}, {}>, title: string, url: string) => void
}

function createRoute(path: string, middleware: lib.Middleware<lib.BaseRequest, {}>) {
  return new lib.Route({
    path,
    middleware,
    parent: { apply: (req, cb) => cb(req, []) }
  })
}

async function createClientRenderer(props: RendererParams) {
  const client = await start(
    assign({
        transitions$: props.transitions$ || DataStream.never(),
        onTitleChange: props.onTitleChange || (() => {}),
        onPushLocation: props.onPushLocation || (() => {}),
        onReplaceLocation: props.onReplaceLocation || (() => {})
      },
      props
    )
  )

  const wrapper = mount(client)
  wrapper.mount()

  return wrapper
}
