import * as React from 'react'
import { startCase } from 'lodash'

import root from './root'

export default () => root()
  .subroute('/greet/:name', 'name')
  .title('Greeting')
  .render(({ pathParams }) => <div>Hello, {startCase(pathParams.name)}!</div>)
