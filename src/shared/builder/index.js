/*
  A Twine "component" is a function that takes two arguments:
      - An execution context object
      - A function that, when invoked, returns a promise that represents eventual the result of the next component in the pipeline
  And should return a promise that represents the eventual result of the current component

  Example:
    function(context, next) {
        return next()
    }

  A built Twine pipeline is a function that takes an execution context object
  and returns a promise that represents the eventual completion (or failure) of executing the pipeline

  Example:
    function(context) {
        return Promise
    }
*/

class TwineBuilder {
  constructor() {
    this._components = []
  }

  addComponent(component) {
    this._components.push(component)
    return this
  }

  buildTwine() {
    return buildTwine(this._components.slice())
  }

  addContextValue(key, value) {
    return this.addComponent((context, next) => {
      context.environment[key] = value
      return next()
    })
  }

  addTwine(twine) {
    return this.addComponent((context, next) => {
      return twine(context).then(next)
    })
  }

  getIdentifier() {
    return null
  }
}

function executeNextComponent(context, components, index) {
  return function() {

    let returnPromise
    try {
      if(index >= 0) {
        returnPromise = Promise.resolve(components[index](context, executeNextComponent(context, components, index - 1)))
      } else {
        returnPromise = Promise.resolve()
      }
    } catch(err) {
      console.error('twine', 'Twine pipeline component faulted', JSON.stringify(err, Object.getOwnPropertyNames(err)))
      returnPromise = Promise.reject(err)
    }
    return returnPromise
  }
}

function buildTwine(components) {
  return function(context) {
    return executeNextComponent(context, components, components.length - 1)()
  }
}

module.exports = TwineBuilder