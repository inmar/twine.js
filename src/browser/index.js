//Setup platform specific helpers
const Platform        = require('../shared/platform')
const BrowserPlatform = require('./platform')
Platform.setPlatform(new BrowserPlatform())

const sharedTwine = require('../shared')

module.exports = {
  ...sharedTwine
}