const Platform          = require('../../shared/platform')
const AbstractPlatform  = require('../../shared/platform/AbstractPlatform')

const createHttpRequest = require('../http/createHttpRequest')

class BrowserPlatform extends AbstractPlatform {
  base64Encode(value) {
    return atob(value)
  }

  base64Decode(value) {
    return btoa(value)
  }

  createHttpRequest(requestOptions) {
    return createHttpRequest(requestOptions)
  }
}

Platform.setPlatform(new BrowserPlatform())