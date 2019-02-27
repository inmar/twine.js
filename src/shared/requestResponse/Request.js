const TwineBuilder = require('../builder')
const RequestTemplate = require('./RequestTemplate')
const TwineError = require('../utils/TwineError')

/**
 * Marks the end of the of the reusable template creation
 *
 * @returns {Request}
 */
class Request extends TwineBuilder {
  constructor(twine, templateName) {
    super()
    super.addTwine(twine)

    this.templateName = templateName
  }

  /**
   * Executes the entire pipeline.
   *
   * The resolved value of the returned promise will be the result of the manipulations
   * executed by the handlers registered with {@link RequestTemplate#handleWhen RequestTemplate#handleWhen}
   *
   * The returned promise will throw in the following scenarios
   *  - The request returning a status that is not handled by the pipeline
   *  - The request failed at the remote (5xx) and, unless there was handler to handle it, it will fail.
   *  - There is an error in the code provided as a callback to the {@link RequestTemplate#handleWhen RequestTemplate#handleWhen} function
   *  - There is an error in the code provided as a callback to the {@link RetryStrategy#escalateRetryDelayWith RetryStrategy#escalateRetryDelayWith} function
   *  - There is an error in the code provided as a callback to the {@link RetryStrategy#fallbackTo RetryStrategy#fallbackTo} function
   *
   * @returns {Promise<*>}
   */
  execute() {
    let context = {
      environment: {
        'twine.RequestInstance': this
      }
    }

    //Make sure that we have handled the request in some form or fashion
    this.addComponent((context, next) => {
      return next().then(() => {
        if (!context.environment['twine.HandlerExecuted']) {
          const statusCode = context.environment['http.ResponseStatusCode']

          //If we faulted, but didn't handle the fault specifically, throw as such.
          if (context.environment['twine.IsRemoteFaulted']) {
            throw new TwineError(`Twine Pipeline RemoteFaulted: ${context.environment['twine.FaultException']}`, context)
          }

          throw new TwineError(`No handler exists for status code ${statusCode} in HTTP response.`, context)
        }
      })
    })

    return super.buildTwine()(context)
    .then(() => context.environment['media.ResponseContent'])
  }

  getIdentifier() {
    return this.templateName
  }
}

module.exports = Request
