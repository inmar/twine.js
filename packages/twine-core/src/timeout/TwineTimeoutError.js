const TwineError = require('../utils/TwineError')

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

    super(message, context, twineBuilder)
    Object.setPrototypeOf(this, TwineTimeoutError.prototype)
    this.name = 'TwineTimeoutError'
  }
}

module.exports = TwineTimeoutError