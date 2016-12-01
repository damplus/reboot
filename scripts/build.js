const { execSync } = require('child_process')
const path = require('path')
const rimraf = require('rimraf')

const tsc = path.join(__dirname, '..', 'node_modules', '.bin', 'tsc')

rimraf.sync('dist')
transpileTS('es5')
transpileTS('es6')

function transpileTS(mode) {
  const outDir = path.join('dist', mode)
  execSync(`${tsc} --outDir ${outDir} --rootDir src --target ${mode}`, { stdio: [0,1,2] })
}
