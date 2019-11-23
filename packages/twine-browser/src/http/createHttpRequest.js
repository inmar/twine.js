import { TwineTimeoutError } from '@inmar/twine-core'

/**
 *
 * @param {RequestOptions} requestOptions
 * @param {Object} context
 *
 * @returns {Promise<RequestResponse>}
 */
export default function createHttpRequest(requestOptions, context) {
  return Promise.race([
    getTimeoutPromise(requestOptions.timeout, context),
    fetch(requestOptions.url, {
      headers: requestOptions.headers,
      method:  requestOptions.method,
      body:    requestOptions.body
    })
  ])
  .then(response => {
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

function getTimeoutPromise(timeout, context) {
  if (!timeout) {
    //A never resolving promise when no timeout is set.
    return new Promise(resolve => {})
  }

  return new Promise((_, reject) => setTimeout(reject, timeout, new TwineTimeoutError(`Http Request timed out after ${timeout}ms`, context)))
}
