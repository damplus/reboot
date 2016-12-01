const { execSync } = require('child_process')

build('reboot-core')
build('reboot-html-client', 'reboot-server')

function build(...packages) {
  packages.forEach(p => {
    execSync(`node_modules/.bin/lerna run transpile --scope "${p}"`, {
      stdio: [0,1,2]
    })
  })
}
