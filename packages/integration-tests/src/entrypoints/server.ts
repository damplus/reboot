declare let global: any
global.fetch = require('node-fetch')

declare const require: any

const routeContext = require.context('../routes', true, /.*\.tsx$/)
const routes = routeContext.keys()
  .map(routeContext)
  .map((x: any) => x.default)

export default routes
