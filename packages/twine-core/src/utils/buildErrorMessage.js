/**
 * Constructs a string for logging with twine specific information.
 *
 * @param {string} message - The error message
 * @param {object} context - (optional) Twine Context for added debug info
 * @param {TwineBuilderLike} twineBuilder - (optional) The TwineBuilder component this error originated from for debug info
 */
module.exports = function buildErrorMessage(message, context = null, twineBuilder = null) {
  //Accepts either a full twine context, or an environment context.
  const environment = context && (context.environment || context)

  let identifier = ''

  const builderInstance = twineBuilder || (environment && environment['twine.RequestInstance'])
  if (builderInstance) {
    identifier = builderInstance.getIdentifier()
  }

  if (!identifier && environment) {
    const serviceName = environment['twine.ResourceServiceName']
    const templateName = environment['twine.RequestTemplateName']
    if (serviceName && templateName) {
      identifier = `${serviceName} :: ${templateName}`
    }
  }

  return identifier ? `[${identifier}] ${message}` : message
}