const { assert } = require('@inmar/twine-core/src/utils')
const { generateZipkinCompatibleUUID } = require('@inmar/twine-core/src/flowTrace/helpers')
const process = require('process')

/**
 * A higher-order function that wraps the handler for an AWS Lambda to capture the provided event and context before
 * passing it on to the provided handler. This function pulls out information about the lambda out of the context
 * and saves it to global variables to facilitate Twine instrumentation.
 * \-
 * Additionally, given that the event provided to the lambda is an AWS API Gateway HTTP event, this function will also set FlowTrace
 * information globally so that any Twine templates will take advantage of it when making requests. This means that
 * the developer <b>does not</b> need to forward the headers of the incoming request to {@link Request#addFlowTraceContext}.
 * \-
 * <b>Note: If `process.env.TWINE_INSTRUMENTATION_APP_NAME` is defined, it will be preferred over `context.functionName`.</b>
 * \-
 * @example
 * const {instrumentation: { instrumentLambdaWith }} = require('@inmar/twine-node')
 *
 * module.exports.handler = instrumentLambdaWith(new MyInstrumentor(), async (event, context) => {
 *   return {
 *     statusCode: 200,
 *     body: JSON.stringify('Hello from Lambda!'),
 *   }
 * })
 *
 * @param {AbstractInstrumentor} instrumentor - Any instance of an AbstractInstrumentor to handle instrumentation info.
 * @param {LambdaHandler} handlerFunction - The handler function that acts as the "main method" for the lambda.
 *
 * @returns {function(object, object): (Promise}
 */
const instrumentLambdaWith = (instrumentor, handlerFunction) => async (event, context) => {
  const timeStartedUtc = Date.now()
  const highResolutionStartTime = process.hrtime()

  assert(instrumentor, `Instrumentor was null or not provided.`)
  assert(context, `Lambda context was null or not provided.`)

  const appName    = process.env.TWINE_INSTRUMENTATION_APP_NAME || context.functionName
  const instanceId = context.invokedFunctionArn

  assert(appName,    `Could not find appName (as functionName) in lambda context`)
  assert(instanceId, `Could not find instanceId (as invokedFunctionArn) in lambda context`)

  global['twine.owin.appInfo'] = {
    appName: appName,
    instanceId: instanceId,
    lambdaContext: context
  }

  let traceId // Trace ID for this request, either pulled from the incoming request or generated below
  let spanId // Span ID for the incoming span, either pulled from the incoming request or generated below
  let parentSpanId // Parent Span ID for the incoming span. Can only be pulled from the incoming request. Only used for reporting the server receive/send event.

  if (event && event.headers) {
    // Event is an AWS API Gateway request. Try to retrieve the flowtrace headers.
    const normalizedHeaders = {}
    for (const headerName in event.headers) {
      normalizedHeaders[headerName.toLowerCase()] = event.headers[headerName]
    }

    traceId = normalizedHeaders['x-b3-traceid']
    spanId = normalizedHeaders['x-b3-spanid']
    parentSpanId = normalizedHeaders['x-b3-parentspanid']
  }

  //Only set the global flowtrace headers if we found both
  //If we didn't find them, start a new trace so any requests made will all share the same traceId
  if (traceId && spanId) {
    // Only set the global flowtrace headers if we found both
    console.log(`Lambda request ID ${context.awsRequestId} continuing trace ID ${traceId} with parent span ${spanId}`)
  }
  else {
    // If we didn't find them, start a new trace so any requests made will all share the same traceId
    // Use the api gateway request id if we can so we can relate the flowtrace back to the http log
    if (event && event.requestContext && event.requestContext.requestId) {
      traceId = event.requestContext.requestId.replace(/-/g, '').substring(0, 16)
      console.log(`Lambda request ID ${context.awsRequestId} derived new trace ID ${traceId} from API Gateway request ID ${event.requestContext.requestId}`)
    }
    else {
      traceId = generateZipkinCompatibleUUID()
      console.log(`Lambda request ID ${context.awsRequestId} created new trace ID ${traceId}`)
    }

    //Since we are considering this request to be the start of the request, the spanId should match the traceId
    spanId = traceId
  }

  global['twine.owin.flowtrace'] = {
    originId: traceId,
    parentId: spanId
  }

  let caughtException

  try {
    //Wait here instead of just returning the promise so that any exception will be handled by the try-catch-finally block
    return await handlerFunction(event, context)
  }
  catch (e) {
    caughtException = e
    throw e
  }
  finally {
    if (traceId && spanId) {
      const [seconds, nanoseconds] = process.hrtime(highResolutionStartTime)
      const microsecondDuration = Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)
      await instrumentor.handleCompletedServerRequest(appName, instanceId, timeStartedUtc, microsecondDuration, traceId, spanId, parentSpanId, caughtException)
    }
  }
}

module.exports = {
  instrumentLambdaWith
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