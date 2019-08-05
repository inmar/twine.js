const process = require('process')

const AbstractPlatform  = require('@test/twine-core/src/platform/AbstractPlatform')
const createHttpRequest = require('../http/createHttpRequest')

class NodePlatform extends AbstractPlatform {
  base64Encode(value) {
    return Buffer.from(value).toString('base64')
  }

  base64Decode(value) {
    return Buffer.from(value, 'base64').toString('utf8')
  }

  createHttpRequest(requestOptions, context) {
    return createHttpRequest(requestOptions, context)
  }

  getTimerStart() {
    return process.hrtime()
  }

  calculateTimerDelta(startTime) {
    const [seconds, nanoseconds] = process.hrtime(startTime)
    return Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)
  }
}

module.exports = NodePlatform