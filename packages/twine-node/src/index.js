//Setup platform specific helpers
const Platform     = require('@test/twine-core/src/platform')
const NodePlatform = require('./platform')
Platform.setPlatform(new NodePlatform())

const sharedTwine     = require('@test/twine-core/src')
const instrumentation = require('./flowTrace/instrumentation')

module.exports = {
  ...sharedTwine,

  instrumentation: {
    ...sharedTwine.instrumentation,
    ...instrumentation
  }
}