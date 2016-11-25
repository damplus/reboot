const Mocha = require('mocha')
const path = require('path')
const fs = require('fs')

require('ts-node/register')


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

var ce = require('chai-enzyme')
var chai = require('chai')
chai.use(ce())



/** Bootstrap */
// Use this rather than mocha CLI to simplify attaching the node debugger

const mocha = new Mocha();

fs.readdirSync(path.join(basepath, 'test')).forEach(file => {
  mocha.addFile(
    path.resolve(path.join(basepath, 'test', file))
  )
})

mocha.run(function(failures){
  process.exit(failures);
});
