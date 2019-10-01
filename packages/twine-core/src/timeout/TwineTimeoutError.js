const TwineError = require('../utils/TwineError')
const { buildErrorMessage } = require('../utils/index')

class TwineTimeoutError extends TwineError {
  /**
   * Constructs an Error with Twine-Timeout specific information.
   *
   * @param {string | number} messageOrTimeout - The timout breached or a custom error message
   * @param {object} context - (optional) Twine Context for added debug info
   * @param {TwineBuilderLike} twineBuilder - (optional) The TwineBuilder component this error originated from for debug info
   */
  constructor (messageOrTimeout, context = null, twineBuilder = null) {
    const message = Number.isNaN(Number(messageOrTimeout))
      ? messageOrTimeout
      : `Twine timeout of ${messageOrTimeout}ms reached`

    const errMessage = buildErrorMessage(message, context, twineBuilder)

    super(errMessage)
    this.name = 'TwineTimeoutError'
  }
}

module.exports = TwineTimeoutError