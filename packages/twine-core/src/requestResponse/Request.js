const TwineBuilder          = require('../builder')
const RequestTemplate       = require('./RequestTemplate')
const TwineError            = require('../utils/TwineError')
const { buildErrorMessage } = require('../utils')

function changeErrorStackToExecutionStack(error, context) {
  //If we aren't an error, promote object to an error
  if (!(error instanceof Error)) {
    error = new TwineError(`Twine Pipeline RemoteFaulted: ${error}`, context)
  }
  else if (!(error instanceof TwineError)) {
    //If we _are_ an error, just update the errMessage with the TemplateName info.
    //We do this instead of just converting everything to a TwineError so that developers can use their own
    // error types and rely on that error flowing out of twine with the correct class-type (for instanceof checks)
    error.message = buildErrorMessage(error.message, context)
  }

  //Get the internal stack and remove the first line from the stack.
  //The first line is of the format: '{Error.name}: {Error.message}'
  //We will instead place the the stack information underr the [TwineInternalStack] header.
  const internalStack = error.stack.split('\n').slice(1).join('\n')

  const stackContextError = context.environment['twine.ExecutionStackContext']
  stackContextError.name = error.name
  stackContextError.message = error.message
  error.stack = `${stackContextError.stack}\n[TwineInternalStack]\n${internalStack}`

  return error
}

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
        'twine.RequestInstance': this,
        'twine.ExecutionStackContext': new Error("STACK-CONTEXT")
      }
    }

    //Make sure that we have handled the request in some form or fashion
    this.addComponent((context, next) => {
      return next().then(() => {
        if (!context.environment['twine.HandlerExecuted']) {
          const statusCode = context.environment['http.ResponseStatusCode']

          //If we faulted, but didn't handle the fault specifically, throw as such.
          if (context.environment['twine.IsRemoteFaulted']) {
            throw context.environment['twine.FaultException']
          }

          throw new TwineError(`No handler exists for status code ${statusCode} in HTTP response.`, context)
        }
      })
    })

    return super.buildTwine()(context)
      .then(() => context.environment['media.ResponseContent'])
      .catch(err => {
        //TODO: Allow for users to chose to _not_ override the error with external context, but to instead use the raw internal error.
        throw changeErrorStackToExecutionStack(err, context)
      })
  }

  getIdentifier() {
    return this.templateName
  }
}

module.exports = Request
