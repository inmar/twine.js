const TwineError = require('./TwineError')

/**
 * Simple helper to validate assumptions and throw errors if they aren't met.
 *
 * @param {*} condition - value used to determine if an error should be thrown. Coerced to bool.
 * @param {string} errMessage - The error message
 * @param {object} context - (optional) Twine Context for added debug info
 * @param {TwineBuilderLike} twineBuilder - (optional) The TwineBuilder (or similar) component this error originated from for debug info
 */
function assert(condition, errMessage, context = null, twineBuilder = null) {
  if (!condition) {
    throw new TwineError(errMessage, context, twineBuilder)
  }
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

/**
 * The native function 'encodeURIComponent' does not encode certain characters mentioned in RFC 3986 (https://datatracker.ietf.org/doc/html/rfc3986)
 * Some APIs do require these characters to be encoded
 * This function was copied directly from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
 * 
 * @param {string} str
 * 
 * @returns {string}
 */
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

module.exports = {
  assert,
  resolveProvider,
  fixedEncodeURIComponent,
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