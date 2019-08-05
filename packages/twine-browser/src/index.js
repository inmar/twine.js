//Setup platform specific helpers
const Platform        = require('@test/twine-core/src/platform')
const BrowserPlatform = require('./platform')
Platform.setPlatform(new BrowserPlatform())

const sharedTwine = require('@test/twine-core/src')

module.exports = {
  ...sharedTwine
}