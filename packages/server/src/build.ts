#!/usr/bin/env node

import * as yargs from 'yargs'
import * as path from 'path'
const webpack = require('webpack')

import { webpackConfig } from './webpack-config'
import * as color from 'colors'

const { argv } = yargs
  .usage('Usage: $0 -o [outDir] -s [serverEntry] [clientEntry]')
  .demand(1, 'No source file specified')
  .option('o', { description: 'Output directory', required: true })
  .option('s', { description: 'Server entrypoint', required: true })

const clientSource = argv._
  .map((x: string) => './' + x)
const outDir = argv.o
const serverSource = argv.s

const browserConfig = webpackConfig({
  debug: false,
  devserver: false,
  entry: clientSource[0],
  extractStyles: true,
  includedModules: [],
  minify: true,
  outDir: path.join(outDir, 'public'),
  target: 'web'
})

const serverConfig = webpackConfig({
  debug: false,
  devserver: false,
  entry: serverSource,
  extractStyles: true,
  includedModules: [],
  minify: false,
  outDir: path.join(outDir, 'server'),
  target: 'node'
})

process.stderr.write('building browser...')
webpack(browserConfig).run((err: Error) => {
  if (err) throw err
  process.stderr.write(` ${color.green('[OK]')}\n`)

  process.stderr.write('building server...')
  webpack(serverConfig).run((err: Error) => {
    if (err) throw err
    process.stderr.write(` ${color.green('[OK]')}\n`)
  })
})
