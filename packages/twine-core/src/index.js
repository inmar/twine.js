require('./requestResponse')
require('./http')
require('./loadBalancer')
require('./flowTrace')
require('./retry')
require('./sdk')
require('./timeout')

const TwineBuilder    = require('./builder')
const ResourceService = require('./requestResponse/ResourceService')
const RequestTemplate = require('./requestResponse/RequestTemplate')
const Request         = require('./requestResponse/Request')
const Receives        = require('./http/Receives')
const RetryStrategy   = require('./retry/RetryStrategy')

const AbstractInstrumentor = require('./flowTrace/instrumentation/AbstractInstrumentor')
const AbstractCluster      = require('./loadBalancer/AbstractCluster')
const AbstractPlatform     = require('./platform/AbstractPlatform')

const TwineError        = require('./utils/TwineError')
const TwineTimeoutError = require('./timeout/TwineTimeoutError')

const Platform         = require('./platform')
const instrumentation  = require('./flowTrace/instrumentation')

/**
 * Function that creates a new Resource Service
 *
 * @param {string} name
 *
 * @returns {ResourceService}
 */
function createResourceService(name) {
  return new ResourceService(name)
}

module.exports = {
  TwineBuilder,

  createResourceService,
  ResourceService,
  RequestTemplate,
  Request,

  Receives,
  RetryStrategy,

  AbstractInstrumentor,
  AbstractCluster,
  AbstractPlatform,

  TwineError,
  TwineTimeoutError,

  Platform,
  instrumentation,
}
