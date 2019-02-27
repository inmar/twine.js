const http  = require('http')
const https = require('https')
const zlib  = require('zlib')

/**
 *
 * @param {RequestOptions} requestOptions
 *
 * @returns {Promise<RequestResponse>}
 */
module.exports = function createHttpRequest(requestOptions, context) {
  const requester = requestOptions.protocol === 'https'
    ? https
    : http

  const options = {
    method:  requestOptions.method,
    headers: requestOptions.headers,
    timeout: requestOptions.timeout
  }

  return new Promise((resolve, reject) => {
    const request = requester.request(requestOptions.url, options)
      .on('response', resolve)
      .on('error', reject)
      .on('timeout', () => {
        request.abort()
        reject(new TwineError(`Request to ${requestOptions.method} - ${requestOptions.url} timed out after ${requestOptions.timeout} milliseconds`, context))
      })

    //Only write out a request body if we actually have one.
    if (requestOptions.body) {
      //Ensure that the body is a Buffer.
      const bufferBody = Buffer.isBuffer(requestOptions.body)
        ? requestOptions.body
        : Buffer.from(requestOptions.body)

      request.write(bufferBody)
    }

    request.end()
  })
  .then(response => {
    return {
      headers:    response.headers,
      statusCode: response.statusCode,
      statusText: response.statusMessage,
      getContent: () => getResponseContent(response)
    }
  })
}

function getResponseContent(response) {
  const contentEncoding = Object.entries(response.headers)
    .find(([name]) => name.toLowerCase() === 'content-encoding')

  const isGzipped = contentEncoding && contentEncoding[1].toLowerCase() === 'gzip'

  const data = []
  return new Promise((resolve, reject) => {
    response
      .on('data', chunk => data.push(chunk))
      .on('end', () => {
        const buffer = Buffer.concat(data)

        if(isGzipped) {
          resolve(zlib.gunzipSync(buffer))
        } else {
          resolve(buffer.toString('utf8'))
        }
      })
      .on('error', reject)
  })
}