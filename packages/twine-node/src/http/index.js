const ResourceService = require('@inmar/twine-core/src/requestResponse/ResourceService')

/**
 * Sets the maximum amount of time, in milliseconds, to wait for the socket to connect before timing out.
 * Not every service respects this setting. For http, the default timeout is 200 milliseconds if not specified.
 *
 * @param {int} milliseconds
 *
 * @returns {RequestTemplate}
 */
ResourceService.prototype.withConnectTimeout = function (milliseconds) {
  return this.addComponent((context, next) => {
    context.environment['net.ConnectTimeout'] = milliseconds
    return next()
  })
}