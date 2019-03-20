const uuidv4     = require('uuid/v4')
const { assert } = require('../utils')

function beginFlowTrace(context) {
  const originId = generateZipkinCompatibleUUID()
  setFlowTraceValues(context, originId, originId, originId)
}

function continueFlowTrace(context, flowtraceContext) {
  const nextRequestId = generateZipkinCompatibleUUID()
  setFlowTraceValues(context, flowtraceContext.originId, flowtraceContext.parentId, nextRequestId)
}

/**
 * Attaches the provided FlowTrace values to the context and headers (if there are headers)
 *
 * @param {Object} context - Twine Context
 * @param {String} originId - The id of the entire FlowTrace path. The originating identifier.
 * @param {String} parentId - The id of the previous span, the requester that spawned this request.
 * @param {String} requestId - The id of the request being constructed by Twine.
 */
function setFlowTraceValues(context, originId, parentId, requestId) {
  assert(originId, `[FlowTrace] Error setting flow trace values: originId is null or empty.`, context)
  assert(parentId, `[FlowTrace] Error setting flow trace values: parentId is null or empty.`, context)
  assert(requestId, `[FlowTrace] Error setting flow trace values: requestId is null or empty.`, context)

  const environment = context.environment

  environment["flowtrace.Origin"] = environment["flowtrace.Origin"] || originId
  environment["flowtrace.Parent"] = environment["flowtrace.Parent"] || parentId
  environment["flowtrace.Request"] = environment["flowtrace.Request"] || requestId

  const requestHeaders = environment["http.RequestHeaders"]
  if (requestHeaders) {
    requestHeaders["x-b3-traceid"] = originId
    requestHeaders["x-b3-spanid"]  = requestId
  }
}

function generateZipkinCompatibleUUID() {
  //Zipkin can't deal with strings longer than 16 nor '-'s
  return uuidv4().replace(/-/g, '').substring(0, 16)
}

module.exports = {
  beginFlowTrace,
  continueFlowTrace,
  generateZipkinCompatibleUUID
}

//Callback and Type documentation. Please don't remove.
/**
 * An object representing the context and route of the
 * current request in relation to previous requests.
 *
 * Use for recording route and timing information for requests.
 *
 * @typedef {Object} FlowTraceContext
 * @property {string} originId - The identifier representing the entire FlowTrace request. Header: X-B3-TraceId
 * @property {string} parentId - The identifier of the incoming request, the previous link in the FlowTrace request. Header: X-B3-SpanId
 */
