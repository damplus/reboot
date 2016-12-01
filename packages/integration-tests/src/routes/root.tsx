import * as React from 'react'
import { app, render, renderContainer, Route, Link, MountRequest } from 'reboot-core'

import counter from './counter'

require('../style.css')

export default (): Route<MountRequest> => app()
  .use(renderContainer(() => <App />))
  .use(render(() => <Home />))

export function App(props: { children?: React.ReactChild }) {
  return (
    <div>
      <div>
        <h1>@damplus/app</h1>
        <Link route={{ handler: counter, params: {} }}>
          Counter
        </Link>
      </div>
      {props.children}
    </div>
  )
}

export function Home() {
  return <h1>Home</h1>
}
