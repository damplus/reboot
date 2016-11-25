const { execSync } = require('child_process')
const path = require('path')
const rimraf = require('rimraf')

const tsc = path.join(__dirname, '..', 'node_modules', '.bin', 'tsc')

rimraf.sync('lib')
transpileTS('es5')
transpileTS('es6')

function transpileTS(mode: string) {
  execSync(`${tsc} --outDir ${path.join('lib', string)} --rootDir src --target=${mode}`, { stdio: [0,1,2] })
}
