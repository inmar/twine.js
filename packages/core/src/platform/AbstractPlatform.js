const AutoBinder = require('../utils/AutoBinder')

/**
 * Contains
 */
class AbstractPlatform extends AutoBinder {
  constructor() {
    super()

    if (this.constructor === AbstractPlatform) {
      throw new TwineError('Cannot create instance of AbstractPlatform. Please extend and implement AbstractPlatform to use it.')
    }
  }

  /**
   * Accepts a string and converts that string to a base64 string.
   *
   * @param {string} rawData - The string to be encoded
   *
   * @return {string} - The encoded content
   */
  base64Encode(rawData) {
    throw new Error("This method is not implemented.")
  }

  /**
   * Accepts a string containing base64 data and decodes it to utf8 data.
   *
   * @param {string} encodedData - The base64 encoded data
   *
   * @return {string} - The decoded content
   */
  base64Decode(encodedData) {
    throw new Error("This method is not implemented.")
  }

  /**
   * This method should construct and execute an HTTP request with the provided requestOptions.
   *
   * @param {RequestOptions} requestOptions - The options defining the http request
   * @param {Object} context - The twine context of the pipeline
   *
   * @return {Promise<RequestResponse>} - Promise representing the result of the request.
   */
  createHttpRequest(requestOptions, context) {
    throw new Error("This method is not implemented.")
  }

  /**
   * Creates a high resolution timer starting point timestamp.
   *
   * The entity returned by this method should not be used directly for timings, but should used in
   * conjunction with {@link AbstractPlatform#calculateTimerDelta} to determine timing durations.
   *
   * @return {*} - High resolution timer timestamp
   */
  getTimerStart() {
    throw new Error("This method is not implemented.")
  }

  /**
   * Calculates the amount of time, in <b>microseconds</b>, that has passed since the provided `startTime`.
   * The provided `startTime` should be an entity retrieved from {@link AbstractPlatform#getTimerStart}
   *
   * @param {*} startTime
   *
   * @return {number} The delta between now and the provided `startTime`, in microseconds.
   */
  calculateTimerDelta(startTime) {
    throw new Error("This method is not implemented.")
  }
}

/**
 * An object representing the options required to construct an http request.
 *
 * @typedef {Object} RequestOptions
 *
 * @property {string} url      - The fully qualified url constructed from the protocol, host, port, path, and query parameters.
 * @property {string} protocol - The protocol of the request ('http' or 'https').
 * @property {string} host     - The hostname or IP which to direct the request to.
 * @property {string} port     - The port which to direct the request to.
 * @property {string} path     - The path to the requested resource.
 * @property {string} method   - The request method. ('GET', 'PUT', 'POST', etc).
 * @property {Object} headers  - The headers for the request.
 * @property {*}      body     - The http request body. If this value is null or undefined, do not include a body in the request.
 * @property {number} timeout  - The max time that this request has before it should be forcibly failed.
 */

/**
 * An object representing properties and values that Twine expects from the object resolved from
 * the {@link Promise} that is returned from calling {@link AbstractPlatform#createHttpRequest}.
 *
 * @typedef {Object} RequestResponse
 *
 * @property {string} statusCode - The status code of the request (200, 404, 500, etc)
 * @property {string} statusText - The text-representation of the status ('ok', 'not found', 'internal server error')
 * @property {Object} headers    - The headers returned in the response. Note: This should be a simple key-value object.
 * @property {function: Promise<string>} getContent - A promise returning function that provides the response's body content.
 */

module.exports = AbstractPlatform