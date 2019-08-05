/**
 * Class that is useful as a base class as it will autobind all methods to the
 * instantiate instance instead having to do it by hand.
 */
class AutoBinder {
  constructor() {
    this._ensureBindings()
  }

  /**
   * Descends the prototype chain, forcibly binding all methods to the instance.
   * This is useful to prevent methods being called with incorrect "this" scope.
   *
   * @protected
   */
  _ensureBindings() {
    let prototype = Object.getPrototypeOf(this)
    do {
      Object.getOwnPropertyNames(prototype).forEach(method => {
        if (method !== 'constructor' && this[method] instanceof Function) {
          this[method] = this[method].bind(this)
        }
      })
      prototype = Object.getPrototypeOf(prototype)
    } while (prototype !== null)
  }
}

module.exports = AutoBinder