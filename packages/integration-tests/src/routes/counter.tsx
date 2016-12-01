import { Stream } from 'xstream'
import * as React from 'react'
import { render, renderTitle } from 'reboot-core'

import root from './root'

export default () => root()
  .subroute('/counter')
  .use(renderTitle(() => 'Counter'))
  .use(render(() =>
    Stream.periodic(1000).startWith(0).map(t => <span>{t}</span>)
  ))
