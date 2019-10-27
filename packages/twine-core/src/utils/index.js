/**
 * Simple helper to validate assumptions and throw errors if they aren't met.
 *
 * @param {*} condition - value used to determine if an error should be thrown. Coerced to bool.
 * @param {string} errMessage - The error message
 * @param {object} context - (optional) Twine Context for added debug info
 * @param {TwineBuilderLike} twineBuilder - (optional) The TwineBuilder (or similar) component this error originated from for debug info
 */
function assert(condition, errMessage, context = null, twineBuilder = null) {
  const TwineError = require('./TwineError')

  if (!condition) {
    throw new TwineError(errMessage, context, twineBuilder)
  }
}

/**
 * Constructs a string for logging with twine specific information.
 *
 * @param {string} message - The error message
 * @param {object} context - (optional) Twine Context for added debug info
 * @param {TwineBuilderLike} twineBuilder - (optional) The TwineBuilder component this error originated from for debug info
 */
function buildErrorMessage(message, context = null, twineBuilder = null) {
  //Accepts either a full twine context, or an environment context.
  const environment = context && (context.environment || context)

  let identifier = ''

  const builderInstance = twineBuilder || (environment && environment['twine.RequestInstance'])
  if (builderInstance) {
    identifier = builderInstance.getIdentifier()
  }

  if (!identifier && environment) {
    const serviceName = environment['twine.ResourceServiceName']
    const templateName = environment['twine.RequestTemplateName']
    if (serviceName && templateName) {
      identifier = `${serviceName} :: ${templateName}`
    }
  }

  return identifier ? `[${identifier}] ${message}` : message
}

/**
 * Takes in a provider that provides some value T and resolves it to Promise<T>
 *
 * @param {ValueProvider} provider
 *
 * @returns {Promise<*>}
 */
function resolveProvider(provider) {
  return Promise.resolve()
    .then(() => {
      if (typeof provider === 'function') {
        return provider()
      }

      return provider
    })
}

module.exports = {
  assert,
  buildErrorMessage,
  resolveProvider
}

/**
 * Represents data, a way to retrieve data, or the promise of data.
 *
 * @typedef ValueProvider
 * @type {
 *  Function<Promise<*>>
 *  | Function<*>
 *  | Promise<*>
 *  | *
 * }
 *
 * @example
 * "my-data"
 *
 * @example
 * () => "my-data"
 *
 * @example
 * Promise.resolve("my-data")
 *
 * @example
 * () => Promise.resolve("my-data")
 */