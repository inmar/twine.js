const http = require('http')
const https = require('https')
const zlib = require('zlib')
const process = require('process')

const { TwineError, TwineTimeoutError } = require('@inmar/twine-core')

const httpAgents = {}

function getRequesterAgent(protocol, requester) {
  let agent = httpAgents[protocol]
  if (!agent) {
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
  let requester
  switch (requestOptions.protocol) {
    case "https":
      requester = https
      break
    case "http":
      requester = http
      break
    default:
      throw new TwineError(`Unrecognized requestOptions.protocol '${requestOptions.protocol}'. Did your twine request template not use either 'usingHttp' or 'usingHttps'?`)
  }

  const options = {
    hostname: requestOptions.host,
    port: requestOptions.port,
    path: '/' + requestOptions.path, //Node requires a leading `/`
    method: requestOptions.method,
    headers: requestOptions.headers,
    agent: getRequesterAgent(requestOptions.protocol, requester)
  }

  // Connect timeout for the socket
  const providedConnectTimeout = context.environment['net.ConnectTimeout']
  const connectTimeout = providedConnectTimeout !== undefined
    ? providedConnectTimeout
    : 500

  // Overall timeout for the request
  let timeoutTime = null //Set just before request is made
  const requestTimeout = requestOptions.timeout || null
  const getTimeRemaining = () => timeoutTime ? timeoutTime - Date.now() : null


  // The request, response and socket that will be created inside the promise
  // Declared here so that event listeners can be cleaned up
  let request
  let response
  let socket

  // Measure connect time for the socket so we can abort if it exceeds the connect timeout
  let connectTimer
  let requestTimer

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

    if (requester === http) {
      clearTimeout(connectTimer)
      connectTimer = undefined

      if (timeoutTime) {
        requestTimer = setTimeout(() => request.emit('timeout'), getTimeRemaining())
      }
    }
  }

  // Event that will occur when socket TLS handshake is complete
  const onSocketSecureConnect = function () {
    const [seconds, nanoseconds] = process.hrtime(hrStartTime)
    context.environment['tcp.SecureConnectTimeUs'] = Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)

    if (requester === https) {
      clearTimeout(connectTimer)
      connectTimer = undefined

      if (timeoutTime) {
        requestTimer = setTimeout(() => request.emit('timeout'), getTimeRemaining())
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

      //If we were provided an overall request timeout that is smaller than the connect timeout, use that.
      const timeRemaining = getTimeRemaining()
      const socketConnectTimeout =
        timeoutTime
          ? connectTimeout
            ? Math.min(connectTimeout, timeRemaining)
            : timeRemaining
          : connectTimeout

      //If no socket timeout was set and there is no request-level timeout, skip setting this.
      if (socketConnectTimeout === null) {
        return
      }

      connectTimer = setTimeout(() => {
        // sometimes this timeout expires when a socket couldn't be acquired, e.g. host not found.
        // Don't do anything in that case.
        if (socket) {
          const error = new TwineTimeoutError(`Socket Connect timed out after ${socketConnectTimeout}ms`, context)
          socket.emit('timeout')
          request.emit('error', error)
        }
      }, socketConnectTimeout)
    }
  }

  // Event listeners for request and response events.
  // Simply declared here but not assigned until inside the promise.
  let onRequestResponse, onRequestError, onRequestTimeout
  let onResponseData, onResponseEnd, onResponseError

  // Cleanup function that should be run whether the request succeeds or fails.
  const onComplete = function () {
    clearTimeout(requestTimer)
    requestTimer = undefined

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
      socket.end()
      socket = null
    }
    if (response) {
      onResponseData && response.removeListener('data', onResponseData)
      onResponseEnd && response.removeListener('end', onResponseEnd)
      onResponseError && response.removeListener('error', onResponseError)
    }
  }

  function getResponseContent(resp) {
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
          const errMessage = "Detected possible TCP connection cutoff due to receiving less data than what was expected based on 'content-length' header"

          console.warn(errMessage)
          return reject(new TwineError(errMessage, context))
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

    timeoutTime = requestTimeout && (Date.now() + requestTimeout)
    request = requester.request(options)

    request.once('socket', onSocket)

    // Assign event handlers
    onRequestResponse = resolve
    onRequestError = reject
    onRequestTimeout = () => {
      request.abort()
      const err = new TwineTimeoutError(`Http Request timed out after ${requestTimeout}ms`, context)
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
        headers: resp.headers,
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