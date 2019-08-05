const RequestTemplate = require("../requestResponse/RequestTemplate")
const RetryStrategy   = require("./RetryStrategy")

/**
 * Protects a pipeline from RemoteFaults
 *
 * @example
 * const template = service.createRequestTemplate('getPostById')
 *   .withMethod('GET')
 *   .withURITemplate('/posts/{postId}')
 *   .withRetryStrategy(new RetryStrategy()
 *     .maxAutoRetries(2)
 *     .delayRetryForMilliseconds(250)
 *     .escalateRetryDelayWith(previousDelay => previousDelay * 1.5)
 *     .fallbackTo(ctx => ({ error: 'Exhausted Retries', ctx })))
 *
 * @param {RetryStrategy} retryStrategy
 *
 * @returns {RequestTemplate}
 */
RequestTemplate.prototype.withRetryStrategy = function(retryStrategy) {
  if (!(retryStrategy instanceof RetryStrategy)) {
    throw new TypeError('provided value for retryStrategy is not an instance of RetryStrategy')
  }

  return this.addComponent((context, next) => {
    return handleRetry(context, next, retryStrategy, 0)
  })
}

//Recursive function to handle re-calling until maxRetries is hit
function handleRetry(context, nextComponent, retryStrategy, retryAttempts, previousDelay = undefined) {
  //Execute the pipeline, then seen if we need to setup additional retries
  return nextComponent().then(() => {

    //Only setup additional retries when the remote is at fault and the status hasn't been handled already
    if (context.environment['twine.HandlerExecuted'] || !retryStrategy._retryWhen(Object.assign({}, context.environment))) {
      return
    }

    const copiedEnvironment = Object.assign({}, context.environment)

    //If we have exceeded our retry amount, execute the fallback if we have one.
    if (retryAttempts >= retryStrategy._maxAutoRetries) {
      //No fallback? Allow the pipeline to continue.
      //The component registered in Request#build() will blowup the pipeline if needed at the end.
      if (!retryStrategy._fallbackTo) {
        return
      }

      return Promise.resolve(retryStrategy._fallbackTo(copiedEnvironment))
        .then(newResponseContent => {
          context.environment['twine.HandlerExecuted'] = true
          context.environment['media.ResponseContent'] = newResponseContent
        })
    }

    retryAttempts++
    const retryDelay = previousDelay !== undefined && retryStrategy._escalateRetryDelayWith
      ? retryStrategy._escalateRetryDelayWith(previousDelay, retryStrategy._delayRetryForMilliseconds, copiedEnvironment, retryAttempts, retryStrategy._maxAutoRetries)
      : retryStrategy._delayRetryForMilliseconds

    return new Promise(resolve => {
      setTimeout(() => resolve(handleRetry(context, nextComponent, retryStrategy, retryAttempts, retryDelay)), retryDelay)
    })
  })
}