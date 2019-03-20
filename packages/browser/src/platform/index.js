const AbstractPlatform = require('@inmar/twine-core/src/platform/AbstractPlatform')

const createHttpRequest = require('../http/createHttpRequest')

class BrowserPlatform extends AbstractPlatform {
  base64Encode(value) {
    return atob(value)
  }

  base64Decode(value) {
    return btoa(value)
  }

  createHttpRequest(requestOptions, context) {
    return createHttpRequest(requestOptions, context)
  }
}

module.exports = BrowserPlatform