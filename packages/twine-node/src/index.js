//Setup platform specific helpers
const Platform     = require('@inmar/twine-core/src/platform')
const NodePlatform = require('./platform')
Platform.setPlatform(new NodePlatform())
require('./http')

const sharedTwine     = require('@inmar/twine-core/src')
const instrumentation = require('./flowTrace/instrumentation')

module.exports = {
  ...sharedTwine,

  instrumentation: {
    ...sharedTwine.instrumentation,
    ...instrumentation
  }
}
