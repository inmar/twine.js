const AbstractPlatform = require('@inmar/twine-core/src/platform/AbstractPlatform')

const createHttpRequest = require('../http/createHttpRequest')

class BrowserPlatform extends AbstractPlatform {
  base64Encode(value) {
    return btoa(value)
  }

  base64Decode(value) {
    return atob(value)
  }

  createHttpRequest(requestOptions, context) {
    return createHttpRequest(requestOptions, context)
  }
}

module.exports = BrowserPlatform