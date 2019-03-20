/**
 * Object representing the configuration of a pipeline's retry functionality
 */
class RetryStrategy {

  constructor() {
    this._maxAutoRetries = 0
    this._delayRetryForMilliseconds = 0;
    this._escalateRetryDelayWith = null
    this._fallbackTo = null
  }

  /**
   * Computes an exponential backoff delay with a randomized jitter.
   * This method is intended to be provided to the {@link escalateRetryDelayWith} method.
   *
   * @example
   * .withRetryStrategy(new RetryStrategy()
   *   .maxAutoRetries(4)
   *   .delayRetryForMilliseconds(200)
   *   .escalateRetryDelayWith(RetryStrategy.exponentialJitter)
   *
   * @param {int} previousDelay
   * @param {int} baseDelay
   * @param {Object} environment
   * @param {int} attemptCount
   * @param {int} maxAttempts
   *
   * @returns {int}
   */
  static exponentialJitter(previousDelay, baseDelay, environment, attemptCount, maxAttempts) {
    const maxDelay = Math.pow(2, maxAttempts) * baseDelay * 2
    const computedMaxDelay = Math.min(maxDelay, Math.pow(2, attemptCount) * baseDelay)
    const jitteredDelay = Math.floor(Math.random() * (computedMaxDelay - baseDelay + 1)) + baseDelay

    return jitteredDelay
  }

  /**
   * The amount of times that a pipeline should re-execute its
   * previous components.
   *
   * <b>Note: This value represents how many <i>retries</i> a pipeline will execute, not the total amount of requests.</b>
   *
   * @example
   * .maxAutoRetries(2)
   *
   * 3 total requests
   *  - 1 initial request
   *  - 2 retry requests
   *
   * @param {int} maxAutoRetries
   *
   * @returns {RetryStrategy}
   */
  maxAutoRetries(maxAutoRetries) {
    this._maxAutoRetries = maxAutoRetries
    return this
  }

  /**
   * The amount of time, in milliseconds, that should be waited between attempts.
   * This is the initial delay when using {@link RetryStrategy#escalateRetryDelayWith escalateRetryDelayWith}.
   *
   * @param {int} milliseconds
   *
   * @returns {RetryStrategy}
   */
  delayRetryForMilliseconds(milliseconds) {
    this._delayRetryForMilliseconds = milliseconds
    return this
  }

  /**
   * Used to modify the delay between retries.
   * Useful for injecting jitter or increased backoff between requests.
   *
   * The following example exhibits an escalation which uses a backoff factor of 1.8
   *
   * @example
   * .withRetryStrategy(new RetryStrategy()
   *   .maxAutoRetries(4)
   *   .delayRetryForMilliseconds(200)
   *   .escalateRetryDelayWith(previousDelay => previousDelay * 1.8))
   *
   * @param {EscalationStrategy} escalationStrategy
   *
   * @returns {RetryStrategy}
   */
  escalateRetryDelayWith(escalationStrategy) {
    this._escalateRetryDelayWith = escalationStrategy
    return this
  }

  /**
   * Used to provide a function which is executed when all retries have been exhausted.
   * Useful to provide a default value or capture the context of a failing request.
   *
   * @param {FallbackStrategy} fallbackStrategy
   *
   * @returns {RetryStrategy}
   */
  fallbackTo(fallbackStrategy) {
    this._fallbackTo = fallbackStrategy
    return this
  }

  //Callback documentation. Please don't remove.
  /**
   * Callback used to determine the next delay between retries.
   *
   * @callback EscalationStrategy
   *
   * @example
   * (previousDelay) => previousDelay + 500
   *
   * @example
   * (previousDelay, initialDelay, ctx) => {
   *   const headers = ctx['http.ResponseHeaders']
   *   const retryAfter = headers.get('Retry-After')
   *
   *   if (retryAfter) {
   *     return +retryAfter
   *   }
   *
   *   return initialDelay
   * }
   *
   * @param {int} previousDelay
   * @param {int} initialDelay
   * @param {Object} twineContext
   *
   * @returns {int}
   */

  /**
   * Callback used when all retries have been exhausted
   *
   * @callback FallbackStrategy
   *
   * @example
   * (ctx) => {
   *   if (ctx['http.ResponseStatusCode'] === 504) {
   *     return {result: 'api-timeout' }
   *   }
   *
   *   return {result: 'unknown-error', ctx}
   * }
   *
   * @param {Object} twineContext
   *
   * @returns {*}
   */
}

module.exports = RetryStrategy