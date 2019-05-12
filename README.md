<h1 align="center">
  <img align="center" width="200" src="./assets/inmar-logo-transparent.png" alt="Inmar Inc. Logo"><br/><br/>
  twine.js
</h1>

<h6 align="center">
  A pipeline-based, extendable, fluent request library.
  <br />
  Providing clarity through explicitness.
</h6>

<h5 align="center">
  <a href="http://inmar.github.io/twine.js/">Demo</a> &nbsp;|&nbsp; 
  <a href="#installation">Installation</a> &nbsp;|&nbsp; 
  <a href="#usage">Usage</a> &nbsp;|&nbsp;
  <a href="#api">API</a>  
</h5>

## Installation

#### Browsers ([npm](https://www.npmjs.com/package/@inmar/twine-browser))
```sh
npm install --save @inmar/twine-browser
```
<b>Note</b>: The browser version depends on `fetch`. If using in a browser that doesn't support `fetch` consider using a polyfill like [whatwg-fetch](https://github.com/github/fetch).

#### Node ([npm](https://www.npmjs.com/package/@inmar/twine-node))
```
npm install --save @inmar/twine-node
```

## Concepts
There are a number of important concept to keep in mind when integrating twine into your application.

### Pipelines
A pipeline is a collection of [components](#Components) that execute sequentially in the order they are added to the pipeline, 
and are split into 3 key sections: [Resource Services](#Resource-Service), [Request Templates](#Request-Template), [Requests](#Request).
The combination of the components from these 3 sections make up a complete pipeline that is executed when twine runs.

#### Resource Service
A Resource Service represents a network resource to which requests can be made. 
Typically, this is an HTTP server, however any type of resource can function as a Resource Service as long as twine has been provided the functionality to understand it.
<br />(Example: PostgreSQL as a Resource Service)

These are the entry point for creating a twine Request Pipeline.

#### Request Template
Request Templates are children to a [Resource Service](#Resource-Service), and represent the instructions telling twine how to **repeatably** make a **specific** request to that service.

#### Request
A Request is the twine representation of a compiled [Request Template](#Request-Template) and is the terminal at which the request can have final options
and modifiers attached before twine executes the entire pipeline to contact the service defined by the [Resource Service](#Resource-Service)

### Components
Components are modules or plugins that modify or add functionality to the pipeline when they are added to it.
Components can be written by consumers of twine to augment pipelines in ways not already included in the library.

### Instrumentation
//TODO

## Usage
```js
const twine = require('@inmar/twine-node')
const {
  Receives,
  RetryStrategy
} = twine

//Note: You only need to construct the service once.
const jsonPlaceholderService = twine.createResourceService('jsonplaceholder.typicode.com')
  .usingHTTPS()

//Note: You only need to construct the template once.
const getTodoTemplate = jsonPlaceholderService.createRequestTemplate('get-todo')
  .withoutInstrumentation()
  .withURITemplate('/todos/{id}')
  .withMethod('GET')
  .withEndpointTimeout(100)
  .receivesJSON()
  .handleWhen(200, [
    Receives.json,
    resp => resp.title
  ])
  .handleWhen(404, () => ({
    error: 'not-found'
  }))
  .withRetryStrategy(new RetryStrategy()
    .maxAutoRetries(2)
    .delayRetryForMilliseconds(250)
    .escalateRetryDelayWith(previousDelay => previousDelay + 100)
    .fallbackTo(() => ({ 
      error: 'retries-exhausted'
    }))
  )

export default async function retrieveTodo(todoId) {
  //Each time we want to make a request, we simply create one from the template and execute it.
  const response = await getTodoTemplate.createRequest()
     .withParameters({id: todoId})
     .execute()
 
  if (!response.error) {
    return response
  }
  
  if (response.error === 'not-found') {
    return null
  }
  
  throw new Error(`Failed to retrieve todo due to error: ${response.error}` )
}
```

## API
//TODO