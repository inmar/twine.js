const TwineError = require('../utils/TwineError')
const { assert } = require('../utils')
/**
 * Class of helpers meant to facilitate manipulation of a received response.
 */
class Receives {
  /**
   * Parses response text as json
   *
   * @param {String} response
   * @param {Object} context
   *
   * @returns {Object | Array}
   */
  static json(response, context) {
    try {
      return JSON.parse(response)
    } catch (e) {
      throw new TwineError(`Response body could not be parsed as JSON`, context)
    }
  }

  /**
   * Substitute a value when response is expected to be empty
   *
   * @typedef {*} T
   *
   * @param {T} substituteValue
   *
   * @returns {function(*, object): T}
   */
  static empty(substituteValue) {
    return (response, context) => {
      assertWithStatus(!response, context, `Receives.Empty used for a response that is not empty.`)

      return substituteValue
    }
  }

  /**
   * Parses the response to JSON and unwraps the Api Item out of its data.item wrapper
   *
   * @param {String} response
   * @param {Object} context
   *
   * @returns {Object}
   */
  static wrappedApiItem(response, context) {
    const json = Receives.json(response, context)

    const data = (json.data || json.Data)
    assertWithStatus(data, context, `Receives.wrappedApiItem used for a response that had no .data property.`)

    const item = (data.item || data.Item)
    assertWithStatus(item, context, `Receives.wrappedApiItem used for a response that had no .data.item property`)

    return item
  }

  /**
   * Parses the response to JSON and unwraps the Api Collection out of its data.items wrapper
   *
   * @param {String} response
   * @param {Object} context
   *
   * @returns {Array}
   */
  static wrappedApiCollection(response, context) {
    const json = Receives.json(response, context)

    const data = (json.data || json.Data)
    assertWithStatus(data, context, `Receives.wrappedApiCollection used for a response that had no .data property.`)

    const items = (data.items || data.Items)
    assertWithStatus(items, context, `Receives.wrappedApiCollection used for a response that had no .data.items property`)

    return items
  }

  /**
   * Sets the result as the raw underlying response object
   *
   * @param {String} response
   * @param {Object} context
   *
   * @returns {Object}
   */
  static raw(response, context) {
    return {
      headers: context["http.ResponseHeaders"],
      statusCode: context["http.ResponseStatusCode"],
      body: context['http.ResponseBody']
    }
  }
}

function assertWithStatus(condition, context, errMessage) {
  assert(condition, `${errMessage}. Status code ${context['http.ResponseStatusCode']}`, context)
}

module.exports = Receives