import { DataStream } from 'reboot-core'
import * as React from 'react'

import root from './root'

export default () => root()
  .subroute('/counter')
  .title('Counter')
  .render(() => DataStream.periodic(1000).map(t => <span>{t}</span>))
