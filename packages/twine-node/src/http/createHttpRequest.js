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
    agent:    getRequesterAgent(requestOptions.protocol, requester)
  }

  // Connect timeout for the socket
  const connectTimeout = context.environment['net.ConnectTimeout'] || 200

  // Overall timeout for the request
  const requestTimeout = requestOptions.timeout

  // The request, response and socket that will be created inside the promise
  // Declared here so that event listeners can be cleaned up
  let request
  let response
  let socket

  // Measure connect time for the socket so we can abort if it exceeds the connect timeout
  let connectTimer

  // Start time for the request
  let hrStartTime

  // Event that will occur when socket lookup completes
  const onSocketLookup = function () {
    const [seconds, nanoseconds] = process.hrtime(hrStartTime)
    context.environment['tcp.LookupTimeUs'] = Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)
  }

  // Event that will occur when socket finishes connecting
  const onSocketConnect = function () {
    const [seconds, nanoseconds] = process.hrtime(hrStartTime)
    context.environment['tcp.ConnectTimeUs'] = Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)

    if (options.protocol === 'http') {
      clearTimeout(connectTimer)
      connectTimer = undefined
      if (requestTimeout) {
        request.setTimeout(requestTimeout)
      }
    }
  }

  // Event that will occur when socket TLS handshake is complete
  const onSocketSecureConnect = function () {
    const [seconds, nanoseconds] = process.hrtime(hrStartTime)
    context.environment['tcp.SecureConnectTimeUs'] = Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)

    if (options.protocol === 'https') {
      clearTimeout(connectTimer)
      connectTimer = undefined
      if (requestTimeout) {
        request.setTimeout(requestTimeout)
      }
    }
  }

  const onSocketTimeout = function () {
    if (socket) {
      // Timeout doesn't close the connection.
      socket.end()
    }
  }

  // Event that will occur when socket is requested
  const onSocket = function (sock) {
    socket = sock

    const [seconds, nanoseconds] = process.hrtime(hrStartTime)
    context.environment['tcp.SocketTimeUs'] = Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)

    if (sock.connecting) {
      sock.once('lookup', onSocketLookup)
      sock.once('connect', onSocketConnect)
      sock.once('secureConnect', onSocketSecureConnect)
      sock.once('timeout', onSocketTimeout)

      connectTimer = setTimeout(() => {
        // sometimes this timeout expires when a socket couldn't be acquired, e.g. host not found.
        // Don't do anything in that case.
        if (socket) {
          const error = new Error('Socket connect timeout')
          error.name = 'connectTimeout'
          error.code = 'ETIMEDOUT'
          error.statusCode = 504
          socket.emit('timeout')
          request.emit('error', error)
        }
      }, connectTimeout)
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
      socket.removeListener('lookup', onSocketLookup)
      socket.removeListener('connect', onSocketConnect)
      socket.removeListener('secureConnect', onSocketSecureConnect)
      socket.removeListener('timeout', onSocketTimeout)
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
      const err = new TwineError(`Request to ${requestOptions.method} - ${requestOptions.url} timed out after ${requestOptions.timeout} milliseconds`, context)
      if (response) {
        response.emit('error', err)
      }
      else {
        reject(err)
      }
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
  .then(resp => {
    response = resp
    return {
      headers:    resp.headers,
      statusCode: resp.statusCode,
      statusText: resp.statusMessage,
      getContent: () => getResponseContent(resp).finally(onComplete)
    }
  })
  .catch(err => {
    onComplete()
    throw err
  })

}