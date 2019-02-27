const InstrumentableRequestTemplate = require('../flowTrace/InstrumentableRequestTemplate')

const ResourceService = require('./ResourceService')
const RequestTemplate = require('./RequestTemplate')
const Request         = require('./Request')
const TwineError      = require('../utils/TwineError')

/**
 * Marks the end of the ResourceService template creation.
 * Creates an {@link InstrumentableRequestTemplate} which provides functions to create {@link RequestTemplate}.
 *
 * A {@link RequestTemplate} models a single access pattern for the {@link ResourceService} it is created from.
 *
 * @example
 * const requestTemplate = resourceService.createRequestTemplate("getSubmission")
 *   .withInstrumentation(new CloudwatchInstrumentor())
 *   .withURITemplate("/api/v2/submissions/{submissionNumber}")
 *   .withMethod("GET")
 *   ...
 *   ...
 *
 * @param requestTemplateName - The name of the template.
 *
 * @returns {InstrumentableRequestTemplate}
 */
ResourceService.prototype.createRequestTemplate = function(requestTemplateName) {
  this.addContextValue('twine.ResourceServiceName', this.serviceName)
  return new InstrumentableRequestTemplate(this, requestTemplateName)
}

/**
 * Marks the end of the of the reusable template creation
 *
 * @returns {Request}
 */
RequestTemplate.prototype.createRequest = function() {
  const twine = this.buildTwine()
  return new Request(twine, this.getIdentifier())
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
 */
ResourceService.prototype.usingServiceResolver = function(resolver) {
  if (resolver == null) {
    throw new TwineError('Twine usingServiceResolver does not accept null or undefined resolvers.')
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
          throw new TwineError(`Failed to resolve host from serviceName: ${serviceName}`)
        }

        context.environment['http.Host'] = host
      })
      .then(next)
  })
}