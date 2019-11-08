const Autobinder = require('../../utils/AutoBinder')

/**
 * A base interface for creating new Instrumentors.
 *
 * An instrumentor is the interface between Twine and an external resource to save FlowTrace logs.
 */
class AbstractInstrumentor extends Autobinder {
  constructor() {
    super()

    if (this.constructor === AbstractInstrumentor) {
      throw new Error('Cannot create instance of AbstractInstrumentor. Please extend and implement AbstractInstrumentor to use it.')
    }
  }

  /**
   * Called to handle a completed Twine pipeline request.
   *
   * The intention of this method is to either immediately send the FlowTrace information
   * off somewhere to be stored or for it to be queued for batch ending later.
   *
   * @param {Object} context - The twine context.
   * @param {string} appName - The current application's name.
   * @param {string} instanceId - String which uniquely identifies this instance of the application.
   * @param {number} startTimeUtc - Request start time in milliseconds from Epoch
   * @param {number} duration - Total duration of request in microseconds.
   */
  handleCompletedRequest(context, appName, instanceId, startTimeUtc, duration) {
    throw new Error("Instrumentor's handleCompletedRequest method has not been implemented!")
  }

  /**
   * Called to handle the completion of fulfilling a server request while on the server. This should NOT
   * be called by the client _receiving_ the response from for a request made.
   *
   * This method will be automatically called when using the {@link instrumentLambdaWith} method. Alternatively,
   * if one isn't using the HOF, the developer can call this by hand _just_ before finishing fulfilling a received request.
   *
   * @param {string} appName - The name of the application that just fulfilled a request.
   * @param {string} instanceId - The unique identifier that identifies this instance of the application.
   * @param {number} startTimeUtc - Request start time in milliseconds from Epoch.
   * @param {number} duration - Total duration of request in microseconds.
   * @param {string} traceId - The identifier for the entire trace.
   * @param {string} spanId - The identifier for this specific request that is being fulfilled.
   * @param {string} parentSpanId - The identifier for the previous request in the trace.
   * @param {Error} exception - Any error generated during the fulfillment of this request.
   *
   * @returns {Promise<void>}
   */
  async handleCompletedServerRequest(appName, instanceId, startTimeUtc, duration, traceId, spanId, parentSpanId, exception) {
    throw new Error("Instrumentor's handleCompletedServerRequest method has not been implemented!")
  }
}

module.exports = AbstractInstrumentor