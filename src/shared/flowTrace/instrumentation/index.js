const { assert } = require('../../utils')

/**
 * Sets the global application name and instance identifier for use in instrumentation.
 *
 * These values are provided as part of the parameters provided to an Instrumentor's handleCompletedRequest method.
 *
 * @param appName - The name of the application which is using Twine (this app).
 * @param instanceId - The unique identifier for this instance of the application. Can be a simple as a generated UUID.
 */
const setGlobalInstrumentationInfo = (appName, instanceId) => {
  assert(appName, `Could not set global instrumentation appName as it is null or empty`)
  assert(instanceId, `Could not set global instrumentation instanceId as it is null or empty`)

  global['twine.owin.appInfo'] = {
    appName: appName,
    instanceId: instanceId
  }
}

module.exports = {
  setGlobalInstrumentationInfo,
}