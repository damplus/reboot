import * as React from 'react'
import { app, renderContainer, Route, Link, MountRequest } from 'reboot-core'

import counter from './counter'
import guestbook from './guestbook'

require('../style.css')

export default (): Route<MountRequest> => app()
  .use(renderContainer(() => <App />))
  .render(<Home />)

export function App(props: { children?: React.ReactChild }) {
  return (
    <div>
      <div>
        <h1>reboot</h1>
        <Link route={{ handler: counter, params: {} }}>
          Counter
        </Link>
        {' | '}
        <Link route={{ handler: guestbook, params: {} }}>
          Guestbook
        </Link>
      </div>
      {props.children}
    </div>
  )
}

export function Home() {
  return <h1>Home</h1>
}
