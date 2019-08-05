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
}

module.exports = AbstractInstrumentor