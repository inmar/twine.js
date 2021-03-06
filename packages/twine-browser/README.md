<h1 align="center">
  <img align="center" width="200" src="./assets/inmar-logo-transparent.png" alt="Inmar Inc. Logo"><br/><br/>
  twine.js
</h1>

<h6 align="center">
  A pipeline-based, extendable, fluent request library.
</h6>

<h5 align="center">
  <a href="#installation">Installation</a> &nbsp;|&nbsp; 
  <a href="#usage">Usage</a> &nbsp;|&nbsp;
  <a href="#concepts">Concepts</a> &nbsp;|&nbsp; 
  <a href="#contribute">Contribute</a>
</h5>

Twine is an [IPC](https://en.wikipedia.org/wiki/Inter-process_communication) request library built around the concept of explicitness. Twine is heavily inspired by [Netflix's Ribbon](https://github.com/Netflix/ribbon).

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

## Usage

#### Commonly Used Methods
There are many components and methods provided by Twine out-of-the-box. Below are the commonly used methods to construct HTTP(S) calls.

**More methods can be found in the source. There is inline documentation for all methods.**



##### Resource Service
 - usingHTTP
 - usingHTTPS
 - createRequestTemplate

##### Request Template
- withURITemplate
- withMethod
- withHeader
- withBearerToken
- withEndpointTimeout
- handleWhen
- withRetryStrategy
- createRequest

##### Request
- withHeader
- withParameters
- withBody
- execute


#### Example
```js
const Twine = require('@inmar/twine-browser')
const {
  Receives,
  RetryStrategy
} = Twine

//Note: You only need to construct the service once.
const jsonPlaceholderService = Twine.createResourceService('jsonplaceholder.typicode.com')
  .usingHTTPS()

//Note: You only need to construct the template once.
const getTodoTemplate = jsonPlaceholderService.createRequestTemplate('get-todo')
  .withoutInstrumentation()
  .withURITemplate('/todos/{id}')
  .withMethod('GET')
  .withTimeout(100)
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

## Concepts
There are a number of important concept to keep in mind when integrating Twine into your application.

### Pipelines
A pipeline is a collection of [components](#Components) that execute sequentially in the order they are added to the pipeline, 
and are split into 3 key sections: [Resource Services](#Resource-Service), [Request Templates](#Request-Template), [Requests](#Request).
The combination of the components from these 3 sections make up a complete pipeline that is executed when Twine runs.

### Components
Components are modules or plugins that modify or add functionality to the pipeline when they are added to it.
Components can be written by consumers of Twine to augment pipelines in ways not already included in the library.

A more extensive explanation with examples is [available on the wiki](https://github.com/inmar/twine.js/wiki/Components).

#### Resource Service
A Resource Service represents a network resource to which requests can be made. 
The most common use-case is an HTTP(S) service, however any type of resource can function as a Resource Service as long as Twine has been provided a `usingXXX` component to understand it.
<br />(Example: PostgreSQL as a Resource Service)

These are the entry points for creating a Twine Request Pipeline.

#### Request Template
Request Templates are children to a [Resource Service](#Resource-Service) and represent the instructions telling Twine how to **repeatably** make a **specific** request to that service.

#### Request
A Request is the Twine representation of a built [Request Template](#Request-Template) and is the terminal at which the request can have final options and modifiers attached before twine executes the entire pipeline to contact the service defined by the [Resource Service](#Resource-Service)

## Contribute
This repository is a mono-repo containing the user-facing libraries `@inmar/twine-browser` and `@inmar/twine-node`.
It also contains the code shared between the two platform implementations as `@inmar/twine-core`.

All npm related actions like `npm install`, `npm publish`, etc are handled via a mono-repo supporting library called [lerna](https://github.com/lerna/lerna).
`Lerna` is used to manage synchronized version bumps and package interdependence via symlinks for local development.

As such, to develop this repository, `lerna` becomes an integral part for dependency management and publishing.

Important Commands
 - [lerna bootstrap](https://github.com/lerna/lerna/tree/master/commands/bootstrap#readme)
 - [lerna add](https://github.com/lerna/lerna/tree/master/commands/add#readme)
 - [lerna version](https://github.com/lerna/lerna/tree/master/commands/version#readme)
 - [lerna publish](https://github.com/lerna/lerna/tree/master/commands/publish#readme)
   - Note, publishing should not be done manually. It will be handled by the CI pipeline given that the package versions are bumped.
 
 ### Initial Setup
 
 1) Pull the repository
```git
git clone https://github.com/inmar/twine.js
```

2) Run `npm install` in the root of the repository to install `lerna`.
As part of the root `npm install`, a `post-install` hook will instruct `lerna` to bootstrap the repository via `lerna link` and `lerna bootstrap`.
This will install and setup all packages and their dependencies.
