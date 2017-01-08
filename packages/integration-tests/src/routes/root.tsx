import * as React from 'react'
import { app, renderContainer, transitionProps, AnyRoute } from 'reboot-core'

import counter from './counter'
import guestbook from './guestbook'
import greeter from './greeter'

require('../style.css')

export default (): AnyRoute => app()
  .use(renderContainer(() => <App />))
  .render(<Home />)

export function App(props: { children?: React.ReactChild }) {
  return (
    <div>
      <div>
        <h1>reboot</h1>
        <a {...transitionProps({ handler: counter, params: {} })}>
          Counter
        </a>
        {' | '}
        <a {...transitionProps({ handler: guestbook, params: {} })}>
          Guestbook
        </a>
        {' | '}
        <a {...transitionProps({ handler: greeter, params: { name: 'world' } })}>
          Greet
        </a>
      </div>
      {props.children}
    </div>
  )
}

export function Home() {
  return <h1>Home</h1>
}
