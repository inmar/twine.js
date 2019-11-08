const twine = require('../src')
const { Receives, RetryStrategy } = twine

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

//Example usage of precreated templates and pipelines
async function main() {
  try {
    const todoId = 1
    const resp = await sampleTemplate.createRequest()
      .withParameters({id: todoId})
      .execute()

    console.log(`Success! Text for todoId '${todoId}' = '${resp}'`)
  }
  catch (e) {
    console.log("It failed!", e)
  }
}

//Start program
main()