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

    let timeoutHandle
    const pipelinePromise = next()
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(reject, timeoutMilliseconds, new TwineTimeoutError(timeoutMilliseconds, context))
    })

    const clearTimer = () => {
      clearTimeout(timeoutHandle)
      timeoutHandle = undefined
    }

    return Promise.race([timeoutPromise, pipelinePromise])
      .then(clearTimer)
      .catch(err => {
        clearTimer()
        if (err instanceof TwineTimeoutError) {
          if (context.environment['twine.TimeoutImplemented']) {
            return pipelinePromise
          }

          context.environment['twine.FaultException'] = err
          context.environment['twine.IsRemoteFaulted'] = true
        }

        throw err
      })
  })
}