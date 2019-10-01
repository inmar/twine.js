const { assert } = require('../utils')

/**
 * Object representing the configuration of a pipeline's retry functionality
 */
class RetryStrategy {

  constructor() {
    this._retryWhen = RetryStrategy.RetryWhen.onRemoteFaulted
    this._maxAutoRetries = 0
    this._delayRetryForMilliseconds = 0;
    this._escalateRetryDelayWith = null
    this._fallbackTo = null
  }

  /**
   * Used to conditionally control when the retry strategy is invoked.
   *
   * <b>Note: This only controls when the RetryStrategy is invoked. A RetryStrategy will not be invoked if a handler has already handled the request!</b>
   *
   * @example
   * //This example shows how one can use the Twine context environment.
   * //The RetryStrategy will only be invoked if there was a TwineTimeoutError throw in pipeline
   * .withRetryStrategy(new RetryStrategy()
   *   .retryWhen(ctx => {
   *     const error = ctx['twine.FaultException']
   *     return error instanceof TwineTimeoutError
   *   })
   *   .maxAutoRetries(2)
   * )
   *
   * @example
   * //In this example, the RetryStrategy _always_ retries, on any possible result, unless we
   * // receive a statusCode of 200, in which case the RetryStrategy is ignored.
   * .handleWhen(200, Receives.json)
   * .withRetryStrategy(new RetryStrategy()
   *   .retryWhen(RetryStrategy.RetryWhen.always)
   *   .maxAutoRetries(2)
   * )
   *
   * @example
   * //This example showcases how you can easily provided multiple predicates.
   * //If any of these return true, the RetryStrategy will be invoked.
   * .handleWhen(200, Receives.json)
   * .handleWhen(409, () => ({error: 'Conflict'}))
   * .withRetryStrategy(new RetryStrategy()
   *   .retryWhen([
   *      RetryStrategy.RetryWhen.onHttpStatus([202, 404, 419]),
   *      RetryStrategy.RetryWhen.onRemoteFaulted
   *   ])
   *   .maxAutoRetries(4)
   *   .escalateRetryDelayWith(previousDelay => previousDelay + 800)
   * )
   *
   * @example
   * //In this erroneous example, the RetryStrategy _never_ retries, even on a 500 http status
   * //This is because a handler has already handled the request and the RetryStrategy
   * // is only looking for 500 status codes.
   * .handleWhen(500, () => "Internal Server Error!")
   * .withRetryStrategy(new RetryStrategy()
   *   .retryWhen(() => RetryStrategy.RetryWhen.onHttpStatus(500))
   *   .maxAutoRetries(2)
   * )
   *
   * @param {
   *  function(object): boolean
   *  | [function(object): boolean]
   * } retryDecider - A function which, when provided a Twine context,
   *  returns true to invoke the RetryStrategy. If the retryDecider is an array of functions,
   *  if any of them return true, the RetryStrategy will be invoked.
   *
   * @returns {RetryStrategy}
   */
  retryWhen(retryDecider) {
    if (!(retryDecider instanceof Array)) {
      retryDecider = [retryDecider]
    }

    for (const decider of retryDecider) {
      assert(typeof decider === 'function', `The retryDecider must be either a function or an array of functions!`)
    }

    this._retryWhen = context => retryDecider.some(decider => decider(context))
    return this
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
    assert(Number.isInteger(maxAutoRetries), 'Parameter must be an integer')
    assert(maxAutoRetries >= 0, 'Parameter must not be negative.')

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
    assert(Number.isInteger(milliseconds), 'Parameter must be an integer')
    assert(milliseconds >= 0, 'Parameter must not be negative.')

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
    assert(typeof escalationStrategy === 'function', 'Parameter must be a function.')

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
    assert(typeof fallbackStrategy === 'function', 'Parameter must be a function')

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

/**
 * A collection of static helpers to simplify the creation of {@link RetryStrategy#retryWhen} predicates.
 */
RetryStrategy.RetryWhen = {
  /**
   * Helper that invokes the RetryStrategy if there was a remote fault.
   * <b>This is the default value for {@link RetryStrategy#retryWhen}</b>
   * \-
   * Remote faults are classified as problems that have occurred that are not the cause of the client
   * and are technically unhandlable by the client in a meaningful way. As an example, in the twine http module,
   * timeouts, socket hangups, and statusCodes >= 500 are considered remote faults.
   *
   * Remote faults are determined by checking the 'twine.RemoteFaulted' Twine context key.
   *
   * @example
   * .retryWhen(RetryStrategy.RetryWhen.onRemoteFaulted)
   *
   * @param {Object} context - The Twine context environment
   *
   * @returns {boolean}
   */
  onRemoteFaulted(context) {
    return context['twine.IsRemoteFaulted']
  },

  /**
   * Helper that accepts single http statuses, an array of statuses,
   * or a predicate that converts a status to a boolean.
   *
   * @example
   * .retryWhen(RetryStrategy.RetryWhen.onHttpStatus(404))
   *
   * @example
   * .retryWhen(RetryStrategy.RetryWhen.onHttpStatus([404, 409, 500]))
   *
   * @example
   * .retryWhen(RetryStrategy.RetryWhen.onHttpStatus(status => status < 200 || status > 299))
   *
   * @param {
   *   number,
   *   [number],
   *   function(number): boolean
   * } statusCodes
   *
   * @returns {function(Object): boolean}
   */
  onHttpStatus(statusCodes) {
    let predicate = statusCodes
    if (typeof predicate === 'number') {
      predicate = [predicate]
    }
    if (predicate instanceof Array) {
      predicate = predicate.includes.bind(predicate)
    }

    return (context) => {
      return predicate(context['http.ResponseStatusCode'])
    }
  },

  /**
   * Helper that adds readability to the fact that the RetryStrategy will
   * always be invoked unless a handler handles the request.
   *
   * @example
   * //Equivalent to () => true
   * .retryWhen(RetryStrategy.RetryWhen.always)
   *
   * @returns {boolean}
   */
  always() {
    return true
  }
}

/**
 * A collection of static helpers implementing common request backoff escalation patterns
 * for use with {@link RetryStrategy#escalateRetryDelayWith}
 */
RetryStrategy.EscalateWith = {
  /**
   * Computes an exponential backoff delay with a randomized jitter.
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
  exponentialJitter(previousDelay, baseDelay, environment, attemptCount, maxAttempts) {
    const maxDelay = Math.pow(2, maxAttempts) * baseDelay * 2
    const computedMaxDelay = Math.min(maxDelay, Math.pow(2, attemptCount) * baseDelay)
    const jitteredDelay = Math.floor(Math.random() * (computedMaxDelay - baseDelay + 1)) + baseDelay

    return jitteredDelay
  }
}

module.exports = RetryStrategy