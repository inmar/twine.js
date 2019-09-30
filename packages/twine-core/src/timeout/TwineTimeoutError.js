const TwineError = require('../utils/TwineError')
const { buildErrorMessage } = require('../utils/index')

class TwineTimeoutError extends TwineError {
  /**
   * Constructs an Error with Twine-Timeout specific information.
   *
   * @param {number} timeoutMilliseconds - The timeout breached
   * @param {object} context - (optional) Twine Context for added debug info
   * @param {TwineBuilderLike} twineBuilder - (optional) The TwineBuilder component this error originated from for debug info
   */
  constructor (timeoutMilliseconds, context = null, twineBuilder = null) {
    const errMessage = buildErrorMessage(`Twine timeout of ${timeoutMilliseconds}ms reached`, context, twineBuilder)

    super(errMessage)
    this.name = 'TwineTimeoutError'
  }
}

module.exports = TwineTimeoutError