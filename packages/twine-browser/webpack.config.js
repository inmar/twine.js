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
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, '..', 'core', 'src')
        ],
        // exclude: /node_modules/,
        use: {
          loader: require.resolve('babel-loader'),
          options: {
            "presets": [
              [require.resolve("@babel/preset-env"), {
                "targets": {
                  "browsers": ["ie >= 11"]
                }
              }]
            ],
            "plugins": [
              require.resolve('@babel/plugin-transform-modules-commonjs'),
              [require.resolve("@babel/plugin-transform-runtime"), {
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