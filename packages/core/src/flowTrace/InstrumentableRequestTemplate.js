const process = require('process')

const RequestTemplate = require('../requestResponse/RequestTemplate')

const { assert } = require('../utils')
const AutoBinder = require('../utils/AutoBinder')
const TwineError = require('../utils/TwineError')

const AbstractInstrumentor = require('./instrumentation/AbstractInstrumentor')
const flowTraceHelpers     = require('./helpers')

/**
 * Represents the intermediate step between a {@link ResourceService} and finishing the creation of a {@link RequestTemplate}.
 * The developer is required to specifically decide whether or not this template will perform instrumentation actions.
 */
class InstrumentableRequestTemplate extends AutoBinder {
  constructor(resourceService, requestTemplateName) {
    super()

    this._resourceService = resourceService
    this._requestTemplateName = requestTemplateName

    resourceService.addComponent(ensureFlowTraceContext)
  }

  /**
   * Setups up all processes needed to:
   *  - Capture start time of the request (in milliseconds after epoch) and total request duration (in microseconds)
   *  - Captures FlowTrace information
   *  - Forwards all captured information to the provided instrumentor after request has completed.
   *
   * @param {AbstractInstrumentor} instrumentor
   *
   * @returns {RequestTemplate}
   *
   * @see {@link withoutInstrumentation}
   */
  withInstrumentation(instrumentor) {
    assert(instrumentor, `[Instrumentation] Provided instrumentor was null or not provided.`, null, this)
    assert(instrumentor instanceof AbstractInstrumentor, `[Instrumentation] Provided instrumentor is not an implementation of AbstractInstrumentor`, null, this)

    this._resourceService.addComponent((context, next) => {
      const appContext = global['twine.owin.appInfo']
      if (!appContext) {
        throw new TwineError("[Instrumentation] Could not find application info. Did you use twine.instrumentation.withInstrumentation (HOF) / setGlobalInstrumentationInfo?", null, this)
      }

      const appName = appContext['appName']
      const instanceId = appContext['instanceId']

      const timeStartedUtc = Date.now()
      const highResolutionStartTime = process.hrtime()

      const handlePipelineCompletion = async () => {
        const [seconds, nanoseconds] = process.hrtime(highResolutionStartTime)
        const microsecondDuration = Math.floor(((seconds * 1e9) + nanoseconds) / 1e3)

        await instrumentor.handleCompletedRequest(context, appName, instanceId, timeStartedUtc, microsecondDuration);
      }

      return next()
        .then(handlePipelineCompletion)
        .catch(async err => {
          await handlePipelineCompletion()
          throw err
        })
    })

    return this._createRequestTemplate()
  }

  /**
   * Creates a {@link RequestTemplate} with no instrumentation. The template will still capture and
   * forward FlowTrace header information, but it will make no attempt to log that information anywhere.
   *
   * @returns {RequestTemplate}
   *
   * @see {@link withInstrumentation}
   */
  withoutInstrumentation() {
    return this._createRequestTemplate()
  }

  getIdentifier() {
    return `${this._resourceService.getIdentifier()}::${this._requestTemplateName}`
  }

  /**
   * @private
   */
  _createRequestTemplate() {
    const twine = this._resourceService.buildTwine()
    return new RequestTemplate(twine, this._requestTemplateName, this._resourceService.getIdentifier())
  }
}

/**
 * If FlowTrace information hasn't already been setup for this request by something like {@link Request#addFlowTraceContext},
 * this sets up context and header information for FlowTrace based on the global FlowTraceContext
 * if it has been set. If it hasn't, it starts a new FlowTraceContext.
 *
 * @param {Object} context - The Twine context
 * @param {Function<Promise>} next - Closure to invoke the next component in the pipeline
 *
 * @returns {Promise}
 */
function ensureFlowTraceContext(context, next) {
  const requestContext = global['twine.owin.flowtrace']

  //If not set by Request.prototype.setFlowTraceInfo
  //Only set the TraceId (Origin) and ParentId if there isn't one already set.
  //If we do set it via begin/continueFlowTrace, the requestId will be set already.
  if (!context.environment['flowtrace.Origin']) {
    if (requestContext) {
      console.debug("[FlowTrace]", "Added FlowTrace info from Global request context to twine request")
      flowTraceHelpers.continueFlowTrace(context, requestContext)
    }
    else {
      console.debug("[FlowTrace]", "No FlowTrace info from request context; starting new FlowTrace")
      flowTraceHelpers.beginFlowTrace(context)
    }
  }
  else {
    //If we didn't just setup new context variables for flowtrace, then we will need to create
    // a new SpanId (flowtrace.Request). Makes sure that retries don't have the same SpanId.
    context.environment['flowtrace.Request'] = flowTraceHelpers.generateZipkinCompatibleUUID()
  }

  return next()
}

module.exports = InstrumentableRequestTemplate