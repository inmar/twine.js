const ResourceService = require('../requestResponse/ResourceService')
const RequestTemplate = require('../requestResponse/RequestTemplate')
const Request         = require('../requestResponse/Request')
const TwineError      = require('../utils/TwineError')
const HttpHandler     = require('./HttpHandler')
const Platform        = require('../platform')

const { resolveProvider, assert } = require('../utils')

/**
 * Sets the request protocol to HTTP
 *
 * @returns {ResourceService}
 */
ResourceService.prototype.usingHTTP = function() {
  return this.addComponent((context, next) => {
    context.environment['http.RequestProtocol'] = 'http'

    return createHTTPResourceServiceModule(context, next)
  })
}

/**
 * Sets the request protocol to HTTPS
 *
 * @returns {ResourceService}
 */
ResourceService.prototype.usingHTTPS = function() {
  return this.addComponent((context, next) => {
    context.environment['http.RequestProtocol'] = 'https'

    return createHTTPResourceServiceModule(context, next)
  })
}

/**
 * Used to resolve the 'serviceName' provided to `twine.createResourceService` to a host url.
 *
 * When given a callback, it will be executed with the `serviceName` passed as the first argument.
 *
 * When given an object (either directly, from the result of a callback, or the resolution of a promise)
 * this component expects that there will be a key on the object that matches the `serviceName`.
 *
 * When given a string (either directly, from the result of a callback, or the resolution of a promise)
 * this component will use the string as the host.
 *
 * @example
 *  const someObjectPromise = Promise.resolve({
 *    google: 'api.google.com',
 *    youtube: 'api.youtube.com'
 *  })
 *
 *  const service = twine.createResourceService('google')
 *    .usingHTTPS()
 *    .usingServiceResolver(someObjectPromise)
 *
 * @example
 *  const someCallbackPromise = () => Promise.resolve({ google: 'api.google.com', youtube: 'api.youtube.com' })
 *
 *  const service = twine.createResourceService('google')
 *    .usingHTTPS()
 *    .usingServiceResolver(someCallbackPromise)
 *
 * @example
 *  const someStringCallback = (serviceName) => {
 *    switch (serviceName):
 *      case 'my-special-api':
 *        return 'special.api.mydomain.com'
 *      case 'google':
 *        return 'api.google.com'
 *  }
 *
 *  const service = twine.createResourceService('google')
 *    .usingHTTPS()
 *    .usingServiceResolver(someCallback)
 *
 * @param {
 *  string
 *  | object
 *  | Promise<string>
 *  | Promise<object>
 *  | Function<string>
 *  | Function<object>
 *  | Function<Promise<string>>
 *  | Function<Promise<Object>>
 * } resolver
 *
 * @returns {ResourceService}
 *
 * @see {@link ResourceService#usingLoadBalancing}
 */
ResourceService.prototype.usingServiceResolver = function(resolver) {
  if (resolver == null) {
    throw new TwineError('Twine usingServiceResolver does not accept null or undefined resolvers.', null, this)
  }

  return this.addComponent((context, next) => {
    const serviceName = context.environment['twine.ResourceServiceName']

    let hostPromise
    if (typeof resolver === 'function') {
      hostPromise = resolver(serviceName)
    }
    else {
      hostPromise = resolver
    }

    return Promise.resolve(hostPromise)
      .then(value => {
        if (typeof value === 'string') {
          return value
        }

        //Guard against undefined / null returned from resolver.
        return value && value[serviceName]
      })
      .then(host => {
        if (!host) {
          throw new TwineError(`Failed to resolve host from serviceName: ${serviceName}`, context)
        }

        context.environment['http.Host'] = host
      })
      .then(next)
  })
}

/**
 * Sets the requester method.
 *
 * @param {string} method
 *
 * @returns {RequestTemplate}
 */
RequestTemplate.prototype.withMethod = function(method) {
  return this.addComponent((context, next) => {
    context.environment['http.RequestMethod'] = method
    return next()
  })
}

/**
 * Quality of Life method that calls both {@link RequestTemplate#sendsJSON sendsJSON} and {@link RequestTemplate#receivesJSON receivesJSON}.
 *
 * @returns {RequestTemplate}
 */
RequestTemplate.prototype.usingJSON = function() {
  return this.sendsJSON().receivesJSON()
}

/**
 * Sets the 'Content-Type' request header to 'application/json' and automatically converts json entities
 * provided to {@link Request#withBody Request#withBody} for transmission over the network.
 *
 * @returns {RequestTemplate}
 */
RequestTemplate.prototype.sendsJSON = function() {
  return this.addComponent((context, next) => {
    addHeaderToContext(context, 'Content-Type', 'application/json')

    const content = context.environment['media.RequestContent']
    if (content) {
      context.environment['http.RequestBody'] = JSON.stringify(content)
    }
    return next()
  })
}

/**
 * Sets the 'Accept' request header to 'application/json'.
 * <b>NOTE:</b> This does <b>NOT</b> convert entities received into JSON objects.
 *
 * To convert received data into JSON entities, the developer will need to handle that conversion in
 * their {@link RequestTemplate#handleWhen handleWhen} functions.
 *
 * @returns {RequestTemplate}
 *
 * @see {@link RequestTemplate#handleWhen handleWhen}
 * @see {@link Receives.json Receives.json}
 * @see {@link JSON.parse JSON.parse}
 */
RequestTemplate.prototype.receivesJSON = function() {
  return this.addComponent((context, next) => {
    addHeaderToContext(context, 'Accept', 'application/json')
    return next()
  })
}

/**
 * Sets the 'Content-Type' request header to 'x-www-form-urlencoded' and encodes key-value maps
 * provided to {@link Request#withBody Request#withBody} for transmission over the network.
 *
 * @returns {RequestTemplate}
 */
RequestTemplate.prototype.sendsFormData = function() {
  return this.addComponent((context, next) => {
    addHeaderToContext(context, 'Content-Type', 'application/x-www-form-urlencoded')

    const content = context.environment['media.RequestContent']
    if (content) {
      const components = []
      for(const key in content) {
        components.push(`${encodeURIComponent(key)}=${encodeURIComponent(content[key])}`)
      }
      context.environment['http.RequestBody'] = components.join('&')
    }
    return next()
  })
}

/**
 * Assumes the content provided to {@link Request#withBody Request#withBody} is
 * either {string} or {Buffer} and prepares it for transmission over the network.
 *
 * @param {string} contentType
 *
 * @returns {RequestTemplate}
 */
RequestTemplate.prototype.sendsRaw = function(contentType) {
  return this.addComponent((context, next) => {
    if(contentType) {
      addHeaderToContext(context, 'Content-Type', contentType)
    }

    //Set the provided media body to the http body without modifications.
    context.environment['http.RequestBody'] = context.environment['media.RequestContent']
    return next()
  })
}

/**
 * Sets a request header to the specified value.
 *
 * @param {string} headerName
 * @param {ValueProvider} headerProvider
 *
 * @returns {RequestTemplate}
 */
RequestTemplate.prototype.withHeader = function(headerName, headerProvider) {
  return addHeader(this, headerName, headerProvider)
}

/**
 * Sets a request header to the specified value.
 *
 * @param {string} headerName
 * @param {ValueProvider} headerProvider
 *
 * @returns {Request}
 */
Request.prototype.withHeader = function(headerName, headerProvider) {
  return addHeader(this, headerName, headerProvider)
}

/**
 * Sets the request path using the provided template in conjunction with the parameters
 * provided by {@link Request#withParameters Request#withParameters}
 *
 * Template parameters should be specified within curly braces.
 *
 * @example
 * //This would produce path of `/api/v2/consumer/123/submissions?offset=100&limit=10`
 *
 * const template = service.createRequestTemplate('getSubmission')
 *   .withMethod('GET')
 *   .withURITemplate('/api/v2/consumer/{consumerId}/submissions')
 *   .handleWhen(200, response => ({status: 'found', data: response}))
 *
 * const request = template.createRequest()
 *   .withParameters({
 *     consumerId: 123,
 *     offset: 100,
 *     limit: 10
 *   })
 *
 * @param {ValueProvider} templateProvider
 *
 * @returns {RequestTemplate}
 *
 * @see {@link Request#withParameters Request#withParameters}
 */
RequestTemplate.prototype.withURITemplate = function(templateProvider) {
  return addURITemplate(templateProvider, this)
}

/**
 * Sets the request path using the provided template in conjunction with the parameters
 * provided by {@link Request#withParameters Request#withParameters}
 *
 * Template parameters should be specified within curly braces.
 *
 * @example
 * //This would produce path of `/api/v2/consumer/123/submissions?offset=100&limit=10`
 *
 * const template = service.createRequestTemplate('getSubmission')
 *   .withMethod('GET')
 *   .handleWhen(200, response => ({status: 'found', data: response}))
 *
 * const request = template.createRequest()
 *   .withURITemplate('/api/v2/consumer/{consumerId}/submissions')
 *   .withParameters({
 *     consumerId: 123,
 *     offset: 100,
 *     limit: 10
 *   })
 *
 * @param {ValueProvider} templateProvider
 *
 * @returns {RequestTemplate}
 *
 * @see {@link Request#withParameters Request#withParameters}
 */
Request.prototype.withURITemplate = function(templateProvider) {
  return addURITemplate(templateProvider, this)
}

/**
 * Given a callback function, promise, or literal string that eventually resolves to an authorization token,
 * this will set the 'authorization' header of the request to 'Bearer $[token}.
 *
 * For a request-specific version of this function, refer to {@link Request#withBearerToken}
 *
 * @param {ValueProvider} tokenProvider
 *
 * @returns {RequestTemplate}
 *
 * @see {@link Request#withBearerToken}
 * @see [b2b-jwt-vendor]{@link https://github.com/inmar/psn_nodejs/tree/master/jwt}
 */
RequestTemplate.prototype.withBearerToken = function(tokenProvider) {
  return addHeader(this, 'Authorization', tokenProvider, token => `Bearer ${token}`)
}

/**
 * Given callback functions, promises, or literal strings that eventually resolve to a username and password,
 * this will set the 'authorization' header of the request to 'Basic $[encoded-credentials].
 *
 * For a request-specific version of this function, refer to {@link Request#withBasicAuth}
 *
 * @param {ValueProvider} usernameProvider
 * @param {ValueProvider} passwordProvider
 *
 * @returns {RequestTemplate}
 *
 */
RequestTemplate.prototype.withBasicAuth = function(usernameProvider, passwordProvider) {
  return addBasicAuth(usernameProvider, passwordProvider, this)
}

/**
 * Adds a handler to the pipeline that will modify the response given that
 * the provided predicate is satisfied.
 *
 * @example
 * const getCompletedSubmissions = service.createRequestTemplate('getSubmissions')
 *   .withMethod('GET')
 *   .usingUriTemplate('/api/v2/consumers/{consumerId}')
 *   .withBearerToken(jwt.getToken)
 *   .receivesJSON()                //Only sets the 'Accept' header.
 *   .handleWhen([200, 404], [
 *     Receives.json,               //Convert to JSON (similar to JSON.parse, just with error logging.
 *     resp => resp.data.items,     //Remove the API wrapper
 *     submissions => {             //Get the ids of all completed submissions
 *       return submissions
 *        .filter(submission => submission.state === 'complete')
 *        .map(submission => submission.id)
 *     },
 *     submissionIds => ({result: 'success', data: submissionIds})
 *   ])
 *   .handleWhen(429, (resp, ctx) => {
 *     return {
 *       result: 'rate-limited',
 *       retryAfter: ctx['http.ResponseHeaders'].get('Retry-After')
 *     }
 *   }
 *   .handleWhen(
 *     ctx => {
 *       const headers = ctx['http.ResponseHeaders']
 *       return headers.get('Known-Broken-Response') === 'itIsBork'
 *     },
 *     (resp, ctx) => ({result: 'known-broken-error', resp, ctx})
 *   )
 *   .handleWhen(() => true, (resp, ctx) => ({result: 'unknown-error', resp, ctx}))
 *
 * @param {int | int[] | Predicate} predicate
 * @param {Component[] | Component} handlers
 *
 * @returns {RequestTemplate}
 *
 * @see {@link RequestTemplate#receivesJSON}
 * @see {@link Receives.json}
 * @see {@link Receives.empty}
 * @see {@link Headers}
 */
RequestTemplate.prototype.handleWhen = function(predicate, handlers) {
  const handler = new HttpHandler(predicate, handlers, this.getIdentifier())
  return this.addHandler(handler)
}

/**
 * Provides content to the pipeline to use as the Request's body.
 *
 * <b>Note:</b> This only does the preliminary work of adding the content to the pipeline.
 * For it to actually be sent along with the request, there must be a pipeline component registered
 * which can understand the content and convert it to a network compatible format.
 *
 * @example
 * const template = service.createRequestTemplate('saveNotes')
 *   .wthMethod('PUT')
 *   .withBearerToken(jwt.getToken)
 *   .withURITemplate('/api/v1/{userId}/notes')
 *   .sendsJSON()    //Converts JSON objects to stringified versions
 *
 * const request = template.createRequest()
 *   .withParameters({ userId: 123 })
 *   .withBody({
 *     notes: "I like this person. They're nice!",
 *     date: new Date().toISOString()
 *   })
 *   .execute()
 *
 * @param {*} body
 *
 * @returns {Request}
 *
 * @see {@link RequestTemplate#sendsJSON}
 */
Request.prototype.withBody = function(body) {
  return this.addComponent((context, next) => {
    context.environment['media.RequestContent'] = body
    return next()
  })
}

/**
 * Sets the parameters that will be used when building the uri template.
 *
 * The values provided here will replace tokens in the tokens specified in the uri template.
 * Any values that were not explicitly specified in the uri template will be appended as query parameters.
 *
 * Nil values (null and undefined) are automatically stripped from the parametersHash before they are applied as
 * query parameters.This does not effect token-replaced parameters. This functionality can be disabled via
 * the stripNilValues parameter
 *
 * @example
 * //This would produce a path of `/api/v2/consumer/123/submissions?offset=100&limit=10`
 *
 * const template = service.createRequestTemplate('getSubmission')
 *   .withMethod('GET')
 *   .withURITemplate('/api/v2/consumer/{consumerId}/submissions')
 *   .handleWhen(200, response => ({status: 'found', data: response}))
 *
 * const request = template.createRequest()
 *   .withParameters({
 *     consumerId: 123,
 *     offset: 100,
 *     limit: 10
 *   })
 *
 * @example
 * //This would produce a path of `/api/v2/consumer/123/submissions?limit=10&param2=null&param3=undefined`
 * //Note the second argument to the .withParameters function.
 *
 *  const template = service.createRequestTemplate('getSubmission')
 *   .withMethod('GET')
 *   .withURITemplate('/api/v2/consumer/{consumerId}/submissions')
 *   .handleWhen(200, response => ({status: 'found', data: response}))
 *
 * const request = template.createRequest()
 *   .withParameters({
 *     consumerId: 123,
 *     limit: 10,
 *     param2: null,
 *     param3: undefined
 *   }, false)
 *
 * @param {Object} parametersHash
 * @param {boolean} stripNilValues
 *
 * @returns {Request}
 *
 * @see {@link RequestTemplate#withURITemplate}
 */
Request.prototype.withParameters = function(parametersHash, stripNilValues = true) {
  return this.addComponent((context, next) => {
    context.environment['http.RequestParametersHash'] = parametersHash
    context.environment['http.RequestParametersHash.StripNilValues'] = stripNilValues
    return next()
  })
}

/**
 * Given callback functions, promises, or literal strings that eventually resolve to a username and password,
 * this will set the 'authorization' header of the request to 'Basic $[encoded-credentials].
 *
  * If you wish to share the same tokenProvider for all requests for a template,
 * consider using {@link RequestTemplate#withBasicAuth}
 *
 * @param {ValueProvider} usernameProvider
 * @param {ValueProvider} passwordProvider
 *
 * @returns {Request}
 *
 */
Request.prototype.withBasicAuth = function(usernameProvider, passwordProvider) {
  return addBasicAuth(this, usernameProvider, passwordProvider)
}

/**
 * Given a callback function, promise, or literal string that eventually resolves to an authorization token,
 * this will set the 'authorization' header of the request to 'Bearer $[token}'
 *
 * If you wish to share the same tokenProvider for all requests for a template,
 * consider using {@link RequestTemplate#withBearerToken}
 *
 * @param {ValueProvider} tokenProvider
 *
 * @returns {Request}
 *
 * @see {@link RequestTemplate#withBearerToken}
 * @see [b2b-jwt-vendor]{@link https://github.com/inmar/psn_nodejs/tree/master/jwt}
 */
Request.prototype.withBearerToken = function(tokenProvider) {
  return addHeader(this, 'Authorization', tokenProvider, token => `Bearer ${token}`)
}

function addURITemplate(templateProvider, objectToAddComponentTo) {
  if (!templateProvider) {
    throw new TwineError('The templateProvider argument to withURITemplate was null or empty.', null, objectToAddComponentTo)
  }

  return objectToAddComponentTo.addComponent((context, next) => {
    return resolveProvider(templateProvider)
      .then(templateUri => {
        let path = templateUri
        const parametersHash = Object.assign({}, context.environment['http.RequestParametersHash'])
        const stripNilValues = context.environment['http.RequestParametersHash.StripNilValues']

        for (const key in parametersHash) {
          const newPath = path.replace(new RegExp(`\\{${key}\\}`, 'ig'), parametersHash[key])
          if (newPath !== path) {
            delete parametersHash[key]
            path = newPath
          }
        }

        //Start or continue the query parameters on the path
        path += path.indexOf('?') === -1
          ? '?'
          : '&'

        //Attach all remaining parameters to the path as query parameters.
        for (const key in parametersHash) {
          const val = parametersHash[key]
          if (stripNilValues && (val === null || val === undefined)) {
            continue
          }

          path += `${encodeURIComponent(key)}=${encodeURIComponent(val)}&`
        }

        //Remove the last query parameter delimiter from the path as it is unneeded.
        return path.slice(0, -1)
      })
      .then(path => context.environment['http.RequestPath'] = path)
      .then(next)
  })
}

function addBasicAuth(twineBuilder, usernameProvider, passwordProvider) {
  return twineBuilder.addComponent((context, next) => {
    return Promise.all([
      resolveProvider(usernameProvider),
      resolveProvider(passwordProvider)
    ])
      .then(([username, password]) => {
        const token = Platform.getPlatform().base64Encode(`${username}:${password}`)
        addHeaderToContext(context, 'Authorization', `Basic ${token}`)
      })
      .then(next)
  })
}

/***
 * Adds an HTTP header to the pipeline's context via a pipeline component.
 * Header value is given as a {@link ValueProvider}, and is only resolve during pipeline execution.
 *
 * @param {TwineBuilder} twineBuilder - The twine builder which we are adding a component to.
 * @param {string} headerName - The string value representing the header's name
 * @param {ValueProvider} headerProvider - The value provider that will resolve to the header's value
 * @param {function(string): string} transform - A callback function which can manipulate the header's value after it is resolved from the provider.
 *
 * @returns {*} - The provided TwineBuilder
 */
function addHeader(twineBuilder, headerName, headerProvider, transform = val => val) {
  assert(headerName,     'Provided headerName is null or empty.', null, twineBuilder)
  assert(headerProvider, 'Provided headerProvider is null or empty.', null, twineBuilder)

  return twineBuilder.addComponent((context, next) => {
    return resolveProvider(headerProvider)
      .then(transform)
      .then(headerValue => addHeaderToContext(context, headerName, headerValue))
      .then(next)
  })
}

/**
 * Adds an HTTP header to the Twine environment context.
 *
 * @param {object} context - The Twine environment context
 * @param {string} headerName - The header's name
 * @param {string} headerValue - The header's value.
 */
function addHeaderToContext(context, headerName, headerValue) {
  const headers = context.environment['http.RequestHeaders'] || {}
  headers[headerName] = headerValue
  context.environment['http.RequestHeaders'] = headers
}

function createHTTPResourceServiceModule(context, next) {
  if (!context.environment['twine.Host']) {
    context.environment['twine.Host'] = context.environment['twine.ResourceServiceName']
  }

  if(context.environment['media.RequestContent'] && !context.environment['http.RequestBody']) {
    throw new TwineError('media.RequestContent was set, but no request media handler was specified', context)
  }

  /**
   * @type {RequestOptions}
   */
  const requestOptions = {
    protocol: context.environment['http.RequestProtocol'],
    method:   context.environment['http.RequestMethod'],
    host:     context.environment['twine.Host'],
    port:     context.environment['twine.Port'],
    path:     context.environment['http.RequestPath'],
    headers:  context.environment['http.RequestHeaders'],
    timeout:  context.environment['twine.RequestTimeout'] || 0,
    body:     context.environment['http.RequestBody'],
  }

  //Remove any trailing slashes that could conflict with the path
  if (requestOptions.path && requestOptions.host.endsWith('/')) {
    requestOptions.host = requestOptions.host.substring(0, requestOptions.host.length - 1)
  }

  //Remove any leading slashes that could conflict with the hostname
  if (requestOptions.path && requestOptions.path.startsWith('/')) {
    requestOptions.path = requestOptions.path.substr(1)
  }

  //Create the fully qualified url
  requestOptions.url = [
    requestOptions.protocol,
    '://',
    requestOptions.host,
    requestOptions.path ? `/${requestOptions.path}` : '',
  ].join('')

  return Platform.getPlatform().createHttpRequest(requestOptions, context)
    .then(response => {
      context.environment["http.ResponseHeaders"]      = response.headers
      context.environment["http.ResponseStatusCode"]   = response.statusCode
      context.environment['http.ResponseReasonPhrase'] = response.statusText

      if (response.statusCode >= 500) {
        context.environment['twine.IsRemoteFaulted'] = true
        context.environment['twine.FaultException'] = new TwineError(
          `Remote host returned a ${response.statusCode} status from ${requestOptions.method} to ${requestOptions.url}`, context)
      }
      else {
        context.environment['twine.IsRemoteFaulted'] = false
        context.environment['twine.FaultException'] = null
      }

      return response.getContent()
    })
    .then(responseData => {
      context.environment['http.ResponseBody'] = responseData
    })
    .catch(err => {
      if (err && err.stack) {
        err = err.stack
      }

      context.environment['http.ResponseBody']         = null
      context.environment['http.ResponseHeaders']      = {}
      context.environment['http.ResponseStatusCode']   = 0
      context.environment['http.ResponseReasonPhrase'] = "The HTTP transport failed"
      context.environment['twine.IsRemoteFaulted']     = true
      context.environment['twine.FaultException']      = new Error(`The HTTP transport failed: ${err}`)
    })
    .then(next)
}