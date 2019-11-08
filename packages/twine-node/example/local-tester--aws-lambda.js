const twine = require('../src')
const { Receives, RetryStrategy, AbstractInstrumentor } = twine
const { instrumentation: { instrumentLambdaWith } } = twine

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

class MyInstrumentor extends AbstractInstrumentor {
  handleCompletedRequest(context, appName, instanceId, startTimeUtc, duration) {
    console.log("finished request", duration)
  }

  async handleCompletedServerRequest(appName, instanceId, startTimeUtc, duration, traceId, spanId, parentSpanId, exception) {
    console.log("finished serving request", duration)
  }
}

exports.handler = instrumentLambdaWith(new MyInstrumentor(), async (event, context) => {

  try {
    const todoId = 1
    const resp = await sampleTemplate.createRequest()
      .withParameters({id: todoId})
      .execute()

    return {
      statusCode: 200,
      body: JSON.stringify(`Success! Text for todoId '${todoId}' = '${resp}'`),
    }
  }
  catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify(`It failed! Error: ${e}`),
    }
  }
})

// === Mocked out event and context ===
const event = {
  headers: {
    'x-b3-traceid': '123',
    'x-b3-spanid': '456'
  }
}
const context = {
  functionName: 'local-tester',
  invokedFunctionArn: 'abc::function::local-tester'
}

//Manual execution of the handler
exports.handler(event, context).then(console.log).catch(console.log)