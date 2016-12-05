const Mocha = require('mocha')
const path = require('path')
const fs = require('fs')

require('ts-node/register')


/** Polyfills */

const fetch = require('node-fetch')
global.fetch = fetch;
global.Response = fetch.Response;
global.Headers = fetch.Headers;
global.Request = fetch.Request;



/** JSDOM Setup */

// Fake out a DOM for testing React components
var jsdom = require('jsdom').jsdom;

global.document = jsdom('');
global.window = document.defaultView;
Object.keys(document.defaultView).forEach((property) => {
  if (typeof global[property] === 'undefined') {
    global[property] = document.defaultView[property];
  }
});

global.navigator = {
  userAgent: 'node.js'
};


/** Chai Plugins */

var chai = require('chai')
chai.use(require('chai-enzyme')())
chai.use(require('chai-cheerio'))



/** Bootstrap */
// Use this rather than mocha CLI to simplify attaching the node debugger

const mocha = new Mocha();

fs.readdirSync(path.join(process.cwd(), 'test')).forEach(file => {
  mocha.addFile(
    path.resolve(path.join(process.cwd(), 'test', file))
  )
})

mocha.run(function(failures){
  process.exit(failures);
});
