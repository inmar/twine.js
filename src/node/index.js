//Setup platform specific helpers
const Platform     = require('../shared/platform')
const NodePlatform = require('./platform')
Platform.setPlatform(new NodePlatform())

const sharedTwine      = require('../shared')
const instrumentation  = require('./flowTrace/instrumentation')

module.exports = {
  ...sharedTwine,

  instrumentation: {
    ...sharedTwine.instrumentation,
    ...instrumentation
  }
}