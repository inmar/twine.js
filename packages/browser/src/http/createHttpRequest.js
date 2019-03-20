const TwineError = require('../../shared/utils/TwineError')

/**
 *
 * @param {RequestOptions} requestOptions
 *
 * @returns {Promise<RequestResponse>}
 */
module.exports = function createHttpRequest(requestOptions, context) {
  return Promise.race([
    getTimeoutPromise(requestOptions.timeout),
    fetch(requestOptions.url, {
      headers: requestOptions.headers,
      method:  requestOptions.method,
      body:    requestOptions.body
    })
  ])
  .then(response => {
    if (response.didTimeout) {
      throw new TwineError(`Request to ${requestOptions.method} - ${requestOptions.url} timed out after ${requestOptions.timeout} milliseconds`, context)
    }

    //Convert Fetch's Headers object to a basic JS object.
    //Reference: https://developer.mozilla.org/en-US/docs/Web/API/Headers
    const headers = {}
    for (const [name, value] of response.headers.entries()) {
      headers[name] = value
    }

    return {
      headers:    headers,
      statusCode: response.status,
      statusText: response.statusText,
      getContent: () => response.text()
    }
  })
}

function getTimeoutPromise(timeout) {
  if (!timeout) {
    //A never resolving promise when no timeout is set.
    return new Promise(resolve => {})
  }

  return new Promise(resolve => setTimeout(resolve, timeout, {didTimeout : true}))
}
