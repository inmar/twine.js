const { assert } = require('../utils')
const Request    = require("../requestResponse/Request")

const flowTraceHelpers = require('./helpers')

/**
 * Adds FlowTrace related info to the request headers and twine context based on the provided context.
 * This method is a Request-specific FlowTrace context and is contrasted by the Global FlowTrace setter:
 * `twine.instrumentation.setInstrumentationAndFlowTraceFromLambdaInfo` which is only available for AWS Lambda invocations.
 *
 * The provided context info should be created based on headers received by this application from another calling
 * application. An application should capture headers and provide them as a flowTraceContext in the following format.
 *
 * @example
 * function(request, response) {
 *   const headers = request.headers
 *
 *   const flowTraceContext = {
 *     originId: headers['x-b3-traceid'],
 *     parentId: headers['x-b3-spanid']
 *   }
 * }
 *
 * The system will take the provided context and make it available as needed to the Request headers and TwineContext.environment.
 * The system also generates a new span/request id as a uuid v4 for the new request.
 *
 * Headers:
 *  X-B3-TraceId: flowTraceContext.originId
 *  X-B3-SpanId: generatedUUID
 *
 * TwineContext.environment:
 *  'flowtrace.Origin': flowTraceContext.originId
 *  'flowtrace.Parent': flowTraceContext.parentId
 *  'flowtrace.Request': generatedUUID
 *
 * @param {FlowTraceContext} flowTraceContext - FlowTrace context from the request received by this application
 * @returns {Request}
 */
Request.prototype.addFlowTraceContext = function(flowTraceContext) {
  assert(flowTraceContext, `[FlowTrace] No FlowTraceContext was provided.`, null, this)
  assert(flowTraceContext.originId, `[FlowTrace] No originId present on provided flowTraceContext`, null, this)
  assert(flowTraceContext.parentId, `[FlowTrace] No parentId present on provided flowTraceContext`, null, this)

  return this.addComponent((context, next) => {
    flowTraceHelpers.continueFlowTrace(context, flowTraceContext)
    return next()
  })
}
