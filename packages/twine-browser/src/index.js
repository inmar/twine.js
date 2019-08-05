//Setup platform specific helpers
const Platform        = require('../../core/src/platform')
const BrowserPlatform = require('./platform')
Platform.setPlatform(new BrowserPlatform())

const sharedTwine = require('../../core/src')

module.exports = {
  ...sharedTwine
}