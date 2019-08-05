const ResourceService = require('../requestResponse/ResourceService')
const Request         = require('../requestResponse/Request')
const TwineError      = require('../utils/TwineError')

/**
 * Creates a connection object if connectionFactory exists.
 * Runs wrappedSdkCall passing context and the connection.
 *
 * @param connectionFactory? {Function<Promise<*>> | Function<*> | Promise<*> | *}
 *
 * @returns {RequestTemplate}
 */
ResourceService.prototype.usingSdk = function(connectionFactory = null) {
  if (!connectionFactory) {
    connectionFactory = Promise.resolve()
  }

  return this.addComponent((context, next) => {
    let connection
    return Promise.resolve()
      .then(() => {
        if (typeof connectionFactory === 'function') {
          return connectionFactory()
        }
        return Promise.resolve(connectionFactory)
      })
      .then(connection_ => {
        connection = connection_
      })
      .then(() => {
        const sdkCall = context.environment['sdk.Call']
        if (!sdkCall) {
          throw new TwineError(`SDK call function was not provided for service "${this.serviceName}"`, context)
        }
        return sdkCall(context, connection)
      })
      .then(sdkResult => {
        context.environment['twine.HandlerExecuted'] = true
        context.environment['media.ResponseContent'] = sdkResult
      })
      .catch(error => {
        context.environment['twine.IsRemoteFaulted'] = true
        context.environment['twine.FaultException'] = error
      })
      .then(next)
  })
}

/**
 * Adds wrappedSdkCall to context for using in ResourceService.usingSdk
 *
 * @param wrappedSdkCall {Function<*>}
 *
 * @returns {Request}
 */
Request.prototype.wrapSdkCall = function(wrappedSdkCall) {
  return this.addComponent((context, next) => {
      context.environment['sdk.Call'] = wrappedSdkCall
      return next()
  })
}
