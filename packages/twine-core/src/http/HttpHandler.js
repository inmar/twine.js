const TwineBuilder = require('../builder')
const TwineError   = require('../utils/TwineError')

/**
 * Class which provides the functionality to conditionally execute pipeline
 * logic based on http status codes or a predicate which uses an http response.
 *
 * @extends TwineBuilder
 */
class HttpHandler extends TwineBuilder {
  /**
   * Defines an HTTP handler than will handle the given status code(s)/predicate function by executing its components.
   *
   * @param {int | int[] | Predicate} predicate
   * @param {Component[] | Component} components
   * @param {string} requestTemplateName
   */
  constructor (predicate = null, components = null, requestTemplateName) {
    super()
    this._statusCodes = null
    this._condition = () => true
    this.requestTemplateName = requestTemplateName

    if (typeof predicate === 'number') {
      this._statusCodes = [predicate]
      this._condition = context => this._statusCodes.includes(context.environment['http.ResponseStatusCode'])
    } else if (Array.isArray(predicate)) {
      this._statusCodes = predicate
      this._condition = context => this._statusCodes.includes(context.environment['http.ResponseStatusCode'])
    } else if (predicate instanceof Function) {
      this._condition = context => predicate(context)
    }

    if (components instanceof Function) {
      components = [components]
    }

    (components || []).forEach(this.addComponent.bind(this))
  }

  addComponent (component, idx) {
    if (typeof component !== 'function') {
      throw new TwineError(`Of the handlers provided to handleWhen, the component at index ${idx} is not a function`, null, this)
    }

    const wrappedComponent = (context, next) => {
      return next().then(() => {
        const originalResponseContent = context.environment['media.ResponseContent']
        return Promise.resolve(component(originalResponseContent, Object.assign({}, context.environment)))
          .then(newResponseContent => {
            context.environment['media.ResponseContent'] = newResponseContent
          })
      })
    }

    if (this._components.length === 0) {
      TwineBuilder.prototype.addComponent.call(this, HttpHandler._firstComponent)
    }

    TwineBuilder.prototype.addComponent.call(this, wrappedComponent)
  }

  static _firstComponent (context, next) {
    context.environment['media.ResponseContent'] = context.environment['http.ResponseBody']
    context.environment['twine.HandlerExecuted'] = true
    return next()
  }

  handles (context) {
    const shouldHandle = this._condition(context)
    return shouldHandle
  }

  getIdentifier() {
    return this.requestTemplateName
  }
}

module.exports = HttpHandler

//Callback documentation. Please don't remove.
/**
 * Callback used to determine whether the handler
 * will execute for this response
 *
 * @callback Predicate
 *
 * @example
 * (ctx) => {
 *   const headers      = ctx['http.ResponseHeaders']
 *   const attemptsLeft = headers.get('X-Attempts-Remaining')
 *
 *   return attemptsLeft < 2
 * }
 *
 * @param {Object} twineContext
 *
 * @returns {boolean}
 */

/**
 * Callback used manipulate the http response
 *
 * @callback Component
 *
 * @example
 * (resp, ctx) => {
 *   const submissions = JSON.parse(resp).data.item
 *
 *   return {
 *     result: submissions.length ? 'found' : 'not-found',
 *     data: submissions
 *   }
 * }
 *
 * @param {*} responseContent
 * @param {Object} twineContext
 *
 * @returns {*}
 */
