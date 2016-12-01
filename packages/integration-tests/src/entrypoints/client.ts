import mount from 'reboot-html-client'

declare const require: any

const routeContext = require.context('../routes', true, /.*\.tsx$/)
const routes = routeContext.keys()
  .map(routeContext)
  .map((x: any) => x.default)

mount(routes)
