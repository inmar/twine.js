//Setup platform specific helpers
const Platform     = require('../../core/src/platform')
const NodePlatform = require('./platform')
Platform.setPlatform(new NodePlatform())

const sharedTwine     = require('../../core/src')
const instrumentation = require('./flowTrace/instrumentation')

module.exports = {
  ...sharedTwine,

  instrumentation: {
    ...sharedTwine.instrumentation,
    ...instrumentation
  }
}