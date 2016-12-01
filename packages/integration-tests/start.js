require('ts-node/register')
require('./src/main').default({ production: process.env.NODE_ENV === 'production' }).then((s) => {
  process.stderr.write('Server started on port ' + s.address().port)
})
.catch(err => console.error(err))
