const { assert } = require('../../../shared/utils')
const { generateZipkinCompatibleUUID } = require('../../../shared/flowTrace/helpers')

/**
 * A higher-order function that wraps the handler for an AWS Lambda to capture the provided event and context before
 * passing it on to the provided handler. This function pulls out information about the lambda out of the context
 * and saves it to global variables to facilitate Twine instrumentation.
 * \-
 * Additionally, given that the event provided to the lambda is an HTTP event, this function will also set FlowTrace
 * information globally so that any Twine templates will take advantage of it when making requests. This means that
 * the developer <b>does not</b> need to forward the headers of the incoming request to {@link Request#addFlowTraceContext}.
 * \-
 * <b>Note: If `process.env.TWINE_INSTRUMENTATION_APP_NAME` is defined, it will be preferred over `context.functionName`.</b>
 * \-
 * @example
 * const {instrumentation: { instrumentLambda }} = require('inmar-twine')
 *
 * module.exports.handler = instrumentLambda(async (event, context) => {
 *   return {
 *     statusCode: 200,
 *     body: JSON.stringify('Hello from Lambda!'),
 *   }
 * })
 *
 * @param {LambdaHandler} handlerFunction - The handler function that acts as the "main method" for the lambda.
 *
 * @returns {function(object, object): (Promise}
 */
const instrumentLambda = (handlerFunction) => async (event, context) => {
  //TODO: capture zipkin serverReceivedTime

  assert(context, `Provided Lambda context was null or not provided.`)

  const appName    = process.env.TWINE_INSTRUMENTATION_APP_NAME || context.functionName
  const instanceId = context.invokedFunctionArn

  assert(appName,    `Could not find appName (as functionName) in lambda context`)
  assert(instanceId, `Could not find instanceId (as invokedFunctionArn) in lambda context`)

  global['twine.owin.appInfo'] = {
    appName: appName,
    instanceId: instanceId,
    lambdaContext: context
  }

  if (event && event.headers) {
    const traceId = event.headers['X-B3-TraceId']
    const spanId = event.headers['X-B3-SpanId']

    //Only set the global flowtrace headers if we found both
    //If we didn't find them, start a new trace so any requests made will all share the same traceId
    if (traceId && spanId) {
      global['twine.owin.flowtrace'] = {
        originId: traceId,
        parentId: spanId
      }
    }
    else {
      const newTraceId = generateZipkinCompatibleUUID()
      global['twine.owin.flowtrace'] = {
        originId: newTraceId,
        parentId: newTraceId
      }
    }
  }

  try {
    const result = await handlerFunction(event, context)
    //TODO: capture zipkin serverSendTime
    return result
  }
  catch (e) {
    //TODO: capture zipkin serverSendTime
    throw e
  }
}

module.exports = {
  instrumentLambda
}

//Callback documentation. Please don't remove.
/**
 * A function that acts as the 'main method' for a lambda.
 *
 * @callback LambdaHandler
 *
 * @param {Object} lambdaEvent - The event provided to the lambda.
 * @param {Object} lambdaContext - The context object provided to an AWS Lambda.
 *
 * @returns {Promise | *}
 */