const AutoBinder = require('../utils/AutoBinder')
const { assert } = require('../utils')

/**
 * An object representing a cluster of services. Acts as the resolver from
 * serviceName to host / port.
 *
 * Also handles logic related to marking a node bad.
 */
module.exports = class AbstractCluster extends AutoBinder {
  constructor(serviceName) {
    super()

    if (this.constructor === AbstractCluster) {
      throw new TwineError('Cannot create instance of AbstractCluster. Please extend and implement AbstractCluster to use it.')
    }

    assert(serviceName, 'Provided serviceName was empty or null. Did you pass through to the super() correctly?')

    this.serviceName = serviceName
  }


  getNodes() {
    throw new Error("This method is not implemented.")
  }

  /**
   * Function used to mark a node bad after the 'twine.IsRemoteFaulted' key has been set to true.
   *
   * Bad nodes should be removed from load balancing for a short time until they have recovered.
   *
   * @param {ServiceNode} badNode
   */
  markNodeDown(badNode) {
    throw new Error("This method is not implemented.")
  }
}

//Callback and Type documentation. Please don't remove.
/**
 * Represents a node on the network that has the service specified
 * by serviceNode. The hostname and port should resolve to the service.
 *
 * @typedef {Object} ServiceNode
 *
 * @property {string} hostname
 * @property {int} port
 */