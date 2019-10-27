const twine = require('../src')
const { Receives, RetryStrategy, CloudwatchInstrumentor } = twine
const { instrumentation: { withInstrumentation } } = twine

const sampleService = twine.createResourceService('jsonplaceholder.typicode.com')
  .usingHTTPS()

const sampleTemplate = sampleService.createRequestTemplate('sampleApiTemplate')
  .withoutInstrumentation()
  .withURITemplate('todos/{id}')
  .withMethod('GET')
  .receivesJSON()
  .withTimeout(200)
  .handleWhen(200, [
    Receives.json,
    resp => resp.title
  ])
  .handleWhen(404, () => ({
    error: 'not found'
  }))
  .withRetryStrategy(new RetryStrategy()
    // .retryWhen([
    //   // RetryStrategy.RetryWhen.onHttpStatus(404),
    //   RetryStrategy.RetryWhen.onRemoteFaulted
    // ])
    .maxAutoRetries(2)
    .delayRetryForMilliseconds(250)
    .escalateRetryDelayWith(previousDelay => previousDelay + 100)
    .fallbackTo(ctx => { throw new Error("Ran out of retries!")})
  )

exports.handler = async (event, context) => {
  twine.instrumentation.setGlobalInstrumentationInfo("myTestApp", "123")

  const req = sampleTemplate.createRequest()
    .withParameters({id: 1})
    .execute()

  const r = await req
    
  return {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda: ' + JSON.stringify(r)),
  }
}

exports.handler().then(console.log).catch(console.log)