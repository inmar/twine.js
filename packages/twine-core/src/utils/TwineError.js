const buildErrorMessage = require('./buildErrorMessage')

class TwineError extends Error {
  /**
   * Constructs an Error with twine specific information.
   *
   * @param {string} message - The error message
   * @param {object} context - (optional) Twine Context for added debug info
   * @param {TwineBuilderLike} twineBuilder - (optional) The TwineBuilder component this error originated from for debug info
   */
  constructor (message, context = null, twineBuilder = null) {
    const errMessage = buildErrorMessage(message, context, twineBuilder)

    super(errMessage)
    Object.setPrototypeOf(this, TwineError.prototype)
    this.name = 'TwineError'
  }
}

module.exports = TwineError

//Callback and Type documentation. Please don't remove.
/**
 * An object that has a `getIdentifier` function that returns a string which represents
 * the component in the Twine pipeline.
 * Typically, this component is just an implementation of {@link TwineBuilder}
 *
 * @typedef TwineBuilderLike
 * @type {object}
 * @property {function<string>} getIdentifier - Function that returns template-specific identifying information about the component.
 */