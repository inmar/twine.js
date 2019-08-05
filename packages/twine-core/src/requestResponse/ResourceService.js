const TwineBuilder = require('../builder')

class ResourceService extends TwineBuilder {
  constructor(name) {
    super()
    super.addContextValue('twine.ResourceServiceName', name)
    this.serviceName = name
  }

  getIdentifier() {
    return this.serviceName
  }
}

module.exports = ResourceService