import { expect } from 'chai'
import { Server } from 'http'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

import startServer from '../src/main'

describe('dev server', function(this: Mocha.IContextDefinition) {
  this.timeout(60000)
  let server: Server

  before(async function(this: Mocha.IContextDefinition) {
    server = await startServer({ production: false })
  })

  const url = (path: string) => `http://localhost:${server.address().port}/${path}`

  it('should serve bundle.js', async () => {
    const response = await fetch(url('bundle.js'))

    expect(response.status).to.eql(200)
    expect(response.headers.get('Content-Type')).to.match(/(text|application)\/javascript/)
  })

  it('should serve index.html', async () => {
    const response = await fetch(url(''))

    expect(response.status).to.eql(200)
    expect(response.headers.get('Content-Type')).to.match(/text\/html/)
  })

  it('should not serverside render', async () => {
    const response = await fetch(url(''))
    const $ = cheerio.load(await response.text())

    expect ($('#app')).to.exist
    expect ($('#app')).to.have.html('')
  })
})
