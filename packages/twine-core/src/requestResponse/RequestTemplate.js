const TwineBuilder = require('../builder')

class RequestTemplate extends TwineBuilder {
  constructor (twine, name, resourceServiceName) {
    super()
    super.addTwine(twine)
    super.addContextValue('twine.RequestTemplateName', name)

    this.templateName = name
    this.resourceServiceName = resourceServiceName
  }

  /**
   * Accepts an extended instance of {@link TwineBuilder} that also implements a `.handle`
   * function which determines if the handler executes in the pipeline.
   *
   * @param {TwineBuilder} handler
   *
   * @returns {RequestTemplate}
   */
  addHandler (handler) {
    const builtHandler = handler.buildTwine()
    const component = (context, next) => {
      return next().then(() => {
        if (!context.environment['twine.HandlerExecuted'] && handler.handles(context)) {
          return builtHandler(context)
        }
      })
    }

    return this.addComponent(component)
  }

  getIdentifier() {
    return `${this.resourceServiceName} :: ${this.templateName}`
  }
}

module.exports = RequestTemplate
