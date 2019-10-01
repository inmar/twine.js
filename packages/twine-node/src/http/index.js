const ResourceService = require('@inmar/twine-core/src/requestResponse/ResourceService')

/**
 * Sets the maximum amount of time, in milliseconds, to wait for the socket to connect before timing out.
 * Not every service respects this setting. The HTTP module supports this component and defaults to 500ms if not used.
 *
 * If <code>null</code> is passed, any default set by a module will be ignored.
 *
 * @param {number | null} milliseconds - The max time allowed for a socket to connect, or <code>null</code> to disable the default.
 *
 * @returns {RequestTemplate}
 */
ResourceService.prototype.withConnectTimeout = function (milliseconds) {
  return this.addComponent((context, next) => {
    context.environment['net.ConnectTimeout'] = milliseconds
    return next()
  })
}