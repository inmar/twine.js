const RequestTemplate = require("../requestResponse/RequestTemplate")
const TwineTimeoutError = require("./TwineTimeoutError")

/**
 * Protects a pipeline from RemoteFaults
 *
 * @example
 * const template = service.createRequestTemplate('getPostById')
 *   .withMethod('GET')
 *   .withURITemplate('/posts/{postId}')
 *   .withTimeout(500)
 *
 * @param {Number} timeoutMilliseconds
 *
 */
RequestTemplate.prototype.withTimeout = function(timeoutMilliseconds) {
  return this.addComponent((context, next) => {
    context.environment['twine.RequestTimeout'] = timeoutMilliseconds

    const timeout = new Promise((_, reject) => setTimeout(reject, timeoutMilliseconds, new TwineTimeoutError(timeoutMilliseconds, context)))
    return Promise.race([timeout, next()]).catch(err => {
      if (err instanceof TwineTimeoutError) {
        context.environment['twine.FaultException'] = err
        context.environment['twine.IsRemoteFaulted'] = true
      }

      throw err
    })
  })
}