import { fromPairs } from 'lodash'
import * as path from 'path'

const webpack = require('webpack')
const autoprefixer = require('autoprefixer')
const flexbugs = require('postcss-flexbugs-fixes')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

export interface WebpackOpts {
  entry: string
  outDir: string
  includedModules: string[]
  debug: boolean

  target: 'node'|'web'
  devserver: boolean
  minify: boolean
  extractStyles: boolean
}

const extensions = ['', '.tsx', '.ts', '.jsx', '.js']
const browserTarget = ['> 2%', 'ie >= 10']

export function webpackConfig(opts: WebpackOpts): {} {
  const processEnv = fromPairs(
    Object.keys(process.env).map(key => ['process.env.' + key, JSON.stringify(process.env[key])])
  )

  const config = {
    devtool: opts.devserver ? 'module-source-map' : undefined,
    target: opts.target,
    externals: (opts.target === 'node') ? shouldExternalise : undefined,
    output: {
      filename: "bundle.js",
      chunkFilename: "[id].bundle.js",
      path: opts.outDir,
      publicPath: '/',
      library: (opts.target === 'node') ? 'server' : undefined,
      libraryTarget: (opts.target === 'node') ? 'commonjs2' : undefined
    },
    resolve: {
      extensions,
      fallback: [
        path.resolve(path.join(__dirname, '..', '..', 'node_modules'))
      ]
    },
    resolveLoader: {
      fallback: [
        path.resolve(path.join(__dirname, '..', '..', 'node_modules'))
      ]
    },
    module: {
      loaders: [
        {
          test: /\.tsx?$/,
          loader: 'ts',
        },
        {
          test: /\.s[ac]ss$/,
          loader: ExtractTextPlugin.extract('style', [
            'css?' + ['localIdentName=[local]__[hash:base64:4]', 'modules', 'importLoaders=1', 'sourceMap'].join('&'),
            'postcss',
            'sass'
          ].join('!'))
        },
        {
          test: /\.css$/,
          loader: (
            opts.extractStyles
            ? ExtractTextPlugin.extract('css!postcss')
            : 'style!css!postcss'
          )
        },
        {
          test: /\.(jpg|png|svg)$/,
          loader: 'file',
          query: {
            name: '[name].[hash].[ext]'
          }
        },
        {
          test: /\.(eot|ttf|woff|woff2)$/,
          loader: 'url',
          query: {
            name: '[name].[hash].[ext]',
            limit: 25000,
          }
        },
        {
          test: /\.json$/,
          loader: 'json'
        }
      ],
    },
    entry: [
      ...opts.includedModules,
      ...conditional(opts.devserver, [
        'webpack-hot-middleware/client?timeout=2000&overlay=false&reload=true'
      ]),
      opts.entry
    ],
    plugins: [
      new webpack.DefinePlugin(processEnv),
      ...conditional(opts.extractStyles, [
        new ExtractTextPlugin(undefined, 'style.css'),
      ]),
      new webpack.optimize.OccurrenceOrderPlugin(false),
      ...conditional(opts.devserver, [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin(),
      ]),
      ...conditional(opts.minify, [
        new webpack.optimize.UglifyJsPlugin({
          compress: {
            warnings: false,
            properties: true,
            sequences: true,
            dead_code: true,
            conditionals: true,
            comparisons: true,
            evaluate: true,
            booleans: true,
            unused: true,
            loops: true,
            hoist_funs: true,
            cascade: true,
            if_return: true,
            join_vars: true,
            negate_iife: true,
            unsafe: false,
            hoist_vars: true,
          },
          output: {
            comments: false,
          },
        }),
        ...conditional(opts.target === 'node', [
          new webpack.DllPlugin({
            name: 'server'
          })
        ])
      ])
    ],
    ts: {
      transpileOnly: true,
      logLevel: 'warn',
      compilerOptions: {
        isolatedModules: true,
        noEmitOnError: false
      }
    },
    postcss: () => [ flexbugs, autoprefixer({ browsers: browserTarget }) ],
  }

  if (process.env.REBOOT_DEBUG) {
    console.log(require('util').inspect(config))
  }

  return config
}

function shouldExternalise(context: string, req: string, cb: (err?: {}, result?: string) => {}): {} {
  const match = (req[0] !== '.') && !path.extname(req)

  if (match) {
    return cb(undefined, 'commonjs ' + req)
  }

  return cb()
}

function conditional(condition: boolean, values: any[]): any[] {
  return condition ? values : []
}
