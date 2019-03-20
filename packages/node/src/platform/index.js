const AbstractPlatform  = require('@inmar/twine-core/src/platform/AbstractPlatform')
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
}

module.exports = NodePlatform