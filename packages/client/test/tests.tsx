import * as React from 'react'
import { expect } from 'chai'
import { Stream } from 'xstream'
import { assign } from 'lodash'
import * as lib from 'reboot-core'
import { mount, ReactWrapper } from 'enzyme'

import { start } from '../src'

describe('client', () => {
  let client: ReactWrapper<any, any>
  afterEach(() => client.unmount())

  it('should render route content', async () => {
    const content = Stream.create<React.ReactElement<{}>>()
      .startWith(<div>1</div>)

    client = await createClientRenderer({
      path: '/',
      routes: [
        new lib.Route({
          path: '/',
          middleware: lib.render(() => content)
        })
      ]
    })
    expect(client.render()).to.have.text('1')

    content.shamefullySendNext(<div>2</div>)
    expect(client.render()).to.have.text('2')
  })

  it('should render route title', async () => {
    let title
    const content = Stream.create<string>()
      .startWith('1')

    client = await createClientRenderer({
      path: '/',
      routes: [
        new lib.Route({
          path: '/',
          middleware: lib.composeMiddleware(lib.renderTitle(() => content), lib.render(<span />))
        })
      ],
      onTitleChange: t => title = t
    })
    client.render()
    expect(title).to.eql('1')

    content.shamefullySendNext('2')
    expect(title).to.eql('2')
  })

  it('should push location on transition', async () => {
    const transitionRequest$ = Stream.createWithMemory<string>()
    const transitions: { title: string, path: string }[] = []
    const target = new lib.Route({
      path: '/link-target',
      middleware: () => Promise.resolve<lib.MountRender>({
        body: Stream.of(<div />),
        title: Stream.of('Target Page'),
        state: 'render'
      })
    })

    client = await createClientRenderer({
      path: '/',
      routes: [
        new lib.Route({
          path: '/',
          middleware: lib.render(() => <div />)
        }),
        target
      ],
      transitions$: transitionRequest$,
      onPushLocation: (target, title, path) => {
        transitions.push({ title, path })
      }
    })

    transitionRequest$.shamefullySendNext('/link-target')
    await nextFrame

    expect(transitions).to.eql([
      { title: 'Target Page', path: '/link-target' }
    ])
  })

  it('should avoid transition races')
})


interface RendererParams {
  routes: lib.Route<lib.BaseRequest>[]
  path: string

  transitions$?: Stream<string>
  onTitleChange?: (title: string) => void
  onPushLocation?: (location: lib.Transition<{}, {}>, title: string, url: string) => void
  onReplaceLocation?: (location: lib.Transition<{}, {}>, title: string, url: string) => void
}

async function createClientRenderer(props: RendererParams) {
  const client = await start(
    assign({
        transitions$: props.transitions$ || Stream.never(),
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

const nextFrame = Promise.resolve()
