import { Stream } from 'xstream'
import * as React from 'react'

import root from './root'

export default () => root()
  .subroute('/counter')
  .title('Counter')
  .render(() => Stream.periodic(1000).startWith(0).map(t => <span>{t}</span>))
