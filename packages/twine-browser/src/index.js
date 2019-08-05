//Setup platform specific helpers
const Platform        = require('@inmar/twine-core/src/platform')
const BrowserPlatform = require('./platform')
Platform.setPlatform(new BrowserPlatform())

const sharedTwine = require('@inmar/twine-core/src')

module.exports = {
  ...sharedTwine
}