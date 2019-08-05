const ResourceService = require('../requestResponse/ResourceService')
const TwineError      = require('../utils/TwineError')
const AbstractCluster = require('./AbstractCluster')

/**
 * Adds a loadbalancer that will resolve the serviceName specified to
 * {@link ResourceService} by way of `twine.createResourceService(serviceName)`
 * or {@link ResourceService#constructor new ResourceService(serviceName)} by using the providedCluster to resolve it to a Host and Port.
 *
 * @example
 * const twine = require('inmar-twine')
 * const service = twine.createResourceService('rebates-submission-master-api')
 *   .usingHTTPS()
 *   .usingLoadBalancing(twine.ConsulCluster)
 *
 * @param {AbstractCluster} Cluster
 *
 * @returns {ResourceService}
 *
 * @see {@link ResourceService}
 * @see {@link AbstractCluster}
 */
ResourceService.prototype.usingLoadBalancing = function(Cluster) {
  let cluster = new Cluster(this.serviceName)
  let index = Math.floor(Math.random() * 50) // Randomize which node is hit first

  function getNextNode(serviceName, nodes, context) {
    if (nodes.length === 0) {
      throw new TwineError(`No nodes available in the load balancer for ${serviceName}`, context)
    }
    else {
      return nodes[index++ % nodes.length]
    }
  }

  return this.addComponent((context, next) => {
    return cluster.getNodes(context)
    .then(nodes => {
      const node = getNextNode(this.serviceName, nodes, context)
      context.environment['twine.Host'] = node.hostname
      context.environment['twine.Port'] = node.port

      const handlePossiblyBadNode = () => {
        if (context.environment['twine.IsRemoteFaulted']) {
          cluster.markNodeDown(node)
        }
      }

      return next()
        .then(handlePossiblyBadNode)
        .catch(err => {
          handlePossiblyBadNode()
          throw err
        })
    })
  })
}

//Callback and Type documentation. Please don't remove.
/**
 * An object representing a cluster of services. Acts as the resolver from
 * serviceName to host / port.
 *
 * Also handles logic related to marking a node bad.
 *
 * @typedef {Object} Cluster
 * @property {Function<ServiceNode[]>} getNodes
 * @property {markNodeDown} markNodeDown
 */

/**
 * Function used to mark a node bad after the 'twine.IsRemoteFaulted'
 * key has been set to true.
 *
 * Bad nodes should be removed from load balancing for a short time until
 * they have recovered.
 *
 * @callback markNodeDown
 * @param {ServiceNode} badNode
 */

/**
 * Represents a node on the network that has the service specified
 * by serviceNode. The hostname and port should resolve to the service.
 *
 * @typedef {Object} ServiceNode
 *
 * @property {string} hostname
 * @property {int} port
 */

/**
 * Used to create a new Cluster from which serviceNames can be resolved to
 * hosts and ports.
 *
 * @callback ClusterConstructor
 *
 * @param {string} serviceName
 *
 * @return {Cluster}
 */
