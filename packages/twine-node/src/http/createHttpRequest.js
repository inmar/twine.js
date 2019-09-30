const http    = require('http')
const https   = require('https')
const zlib    = require('zlib')
const process = require('process')

const TwineError = require('@inmar/twine-core/src/utils/TwineError')

const httpAgents = {}

function getRequesterAgent(protocol, requester) {
  let agent = httpAgents[protocol]
  if(!agent) {
    agent = requester.Agent({
      keepAlive: true
    })
    httpAgents[protocol] = agent
  }

  return agent
}

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
    timeout:  requestOptions.timeout,
    agent:    getRequesterAgent(requestOptions.protocol, requester)
  }

  // The request, response and socket that will be created inside the promise
  // Declared here so that event listeners can be cleaned up
  let request
  let response
  let socket

  // Start time for the request
  let hrStartTime

  // Event that will occur when socket lookup completes
  const onLookup = function () {
    const [seconds, nanoseconds] = process.hrtime(hrStartTime)
    context.environment['tcp.LookupTimeUs'] = Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)
  }

  // Event that will occur when socket finishes connecting
  const onConnect = function () {
    const [seconds, nanoseconds] = process.hrtime(hrStartTime)
    context.environment['tcp.ConnectTimeUs'] = Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)
  }

  // Event that will occur when socket TLS handshake is complete
  const onSecureConnect = function () { }

  // Event that will occur when socket is requested
  const onSocket = function (sock) {
    socket = sock

    const [seconds, nanoseconds] = process.hrtime(hrStartTime)
    context.environment['tcp.SocketTimeUs'] = Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)

    if (sock.connecting) {
      sock.once('lookup', onLookup)
      sock.once('connect', onConnect)
      sock.once('secureConnect', onSecureConnect)

      // TODO: Support socket connect timeout
    }
  }

  // Event listeners for request and response events.
  // Simply declared here but not assigned until inside the promise.
  let onRequestResponse, onRequestError, onRequestTimeout
  let onResponseData, onResponseEnd, onResponseError

  // Cleanup function that should be run whether the request succeeds or fails.
  const onComplete = function () {
    if (request) {
      request.removeListener('socket', onSocket)
      onRequestResponse && request.removeListener('response', onRequestResponse)
      onRequestTimeout && request.removeListener('timeout', onRequestTimeout)
      if (onRequestError) {
        request.removeListener('error', onRequestError)
        // Since the socket is still open due to keep alive, requests might hang out for a while and throw errors if the socket closes.
        // Ignore any such errors.
        request.on('error', () => { })
      }
    }
    if (socket) {
      socket.removeListener('lookup', onLookup)
      socket.removeListener('connect', onConnect)
      socket.removeListener('secureConnect', onSecureConnect)
      socket = null
    }
    if (response) {
      onResponseData && response.removeListener('data', onResponseData)
      onResponseEnd && response.removeListener('end', onResponseEnd)
      onResponseError && response.removeListener('error', onResponseError)
    }
  }

  function getResponseContent(response) {
    const isGzipped = (response.headers['content-encoding'] || '').toLowerCase() === 'gzip'

    const data = []
    return new Promise((resolve, reject) => {
      // Assign event handlers
      onResponseData = (chunk) => data.push(chunk)
      onResponseEnd = () => {
        const buffer = Buffer.concat(data)
        const headers = context.environment["http.ResponseHeaders"]
        const contentLength = headers['content-length']
        if (contentLength && +contentLength !== buffer.length) {
          console.warn("Detected possible TCP connection cutoff due to receiving less data than what was expected based on 'content-length' header.")
          return reject(new Error("Detected possible TCP connection cutoff due to receiving less data than what was expected based on 'content-length' header."))
        }

        if (isGzipped) {
          resolve(zlib.gunzipSync(buffer))
        } else {
          resolve(buffer.toString('utf8'))
        }
      }
      onResponseError = reject

      resp
        .on('data', onResponseData)
        .on('end', onResponseEnd)
        .on('error', onResponseError)
    })
  }

  return new Promise((resolve, reject) => {
    hrStartTime = process.hrtime()

    request = requester.request(options)

    request.once('socket', onSocket)

    // Assign event handlers
    onRequestResponse = resolve
    onRequestError = reject
    onRequestTimeout = () => {
      request.abort()
      reject(new TwineError(`Request to ${requestOptions.method} - ${requestOptions.url} timed out after ${requestOptions.timeout} milliseconds`, context))
    }

    request.once('response', onRequestResponse)
    request.once('error', onRequestError)
    request.once('timeout', onRequestTimeout)

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
      getContent: () => getResponseContent(response).finally(onComplete)
    }
  })
  .catch(err => {
    onComplete()
    throw err
  })

}