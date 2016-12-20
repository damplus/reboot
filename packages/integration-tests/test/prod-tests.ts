import { expect } from 'chai'
import { Server } from 'http'
import { execSync } from 'child_process'
import fetch from 'node-fetch'
import * as rimraf from 'rimraf'
import * as cheerio from 'cheerio'

import startServer from '../src/main'

describe('production server', function() {
  let server: Server

  before(async function(this: Mocha.IHookCallbackContext) {
    this.timeout(60000)

    rimraf.sync('build')
    execSync(`node node_modules/.bin/build-reboot-app -o build -s './src/entrypoints/server.ts' './src/entrypoints/client.ts'`)
    server = await startServer({ production: true, buildDir: 'build' })
  })

  const url = (path: string) => `http://localhost:${server.address().port}/${path}`

  it('should serve bundle.js', async () => {
    const response = await fetch(url('bundle.js'))

    expect(response.status).to.eql(200)
    expect(response.headers.get('Content-Type')).to.match(/(text|application)\/javascript/)
  })

  it('should serve style.css', async () => {
    const response = await fetch(url('style.css'))

    expect(response.status).to.eql(200)
    expect(response.headers.get('Content-Type')).to.match(/text\/css/)
  })

  it('should serverside render', async () => {
    const response = await fetch(url(''))
    const $ = cheerio.load(await response.text())

    expect ($('#app')).to.not.be.empty
    expect ($('#app').html().trim()).to.not.be.empty
  })

  it('should link to style.css', async () => {
    const response = await fetch(url(''))

    const $ = cheerio.load(await response.text())
    expect($('link[href="/style.css"]')).to.exist
  })
})
