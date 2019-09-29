const webpack = require('webpack')
const path = require('path')
const args = require('yargs').argv

const libraryInfo    = require('./package')
const libraryName    = 'twine-browser'
const libraryVersion = libraryInfo.version

const NoOpPlugin = () => {}
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const TerserPlugin         = require('terser-webpack-plugin');

const config = {
  mode: 'production',
  entry: {
    [libraryName]:          path.join(__dirname, '/src/index.js'),
    [libraryName + '.min']: path.join(__dirname, '/src/index.js')
  },
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name].js',
    library: ['inm', 'twine'],
    libraryTarget: 'umd',
  },
  resolve: {
    modules: [path.resolve(__dirname, 'node_modules')]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, '..', 'twine-core', 'src')
        ],
        // exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            "presets": [
              ["@babel/preset-env", {
                "targets": {
                  "browsers": ["ie >= 11"]
                }
              }]
            ],
            "plugins": [
              "@babel/plugin-transform-modules-commonjs",
              ["@babel/plugin-transform-runtime", {
                coreJs: false,
                helpers: true,
                regenerator: false,
                useESModules: false
              }]
            ]
          }
        }
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      include: /\.min\.js$/,
      sourceMap: true
    })]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.LIBRARY_VERSION': JSON.stringify(libraryVersion)
    }),
    args.showBundleSize
      ? new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: true,
        reportFilename: '../../bundle_analysis.html'
      })
      : NoOpPlugin
  ]
}

module.exports = config