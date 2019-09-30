const http  = require('http')
const https = require('https')
const zlib  = require('zlib')

const TwineError = require('@inmar/twine-core/src/utils/TwineError')

/**
 *
 * @param {RequestOptions} requestOptions
 * @param {Object} context
 *
 * @returns {Promise<RequestResponse>}
 */
module.exports = function createHttpRequest(requestOptions, context) {
  const requester = requestOptions.protocol === 'https'
    ? https
    : http

  const options = {
    hostname: requestOptions.host,
    port:     requestOptions.port,
    path:     '/' + requestOptions.path, //Node requires a leading `/`
    method:   requestOptions.method,
    headers:  requestOptions.headers,
    timeout:  requestOptions.timeout
  }

  return new Promise((resolve, reject) => {
    const request = requester.request(options)
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

      request.setHeader('Content-Length', bufferBody.length)
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
  const isGzipped = (response.headers['content-encoding'] || '').toLowerCase() === 'gzip'

  const data = []
  return new Promise((resolve, reject) => {
    response
      .on('data', chunk => data.push(chunk))
      .on('end', () => {
        const buffer = Buffer.concat(data)
        const contentLength = response.headers['content-length']
        if (contentLength && +contentLength !== buffer.length) {
          console.warn("Detected possible TCP connection cutoff due to receiving less data than what was expected based on 'content-length' header.")
          return reject(new Error("Detected possible TCP connection cutoff due to receiving less data than what was expected based on 'content-length' header."))
        }

        if(isGzipped) {
          resolve(zlib.gunzipSync(buffer))
        } else {
          resolve(buffer.toString('utf8'))
        }
      })
      .on('error', reject)
  })
}