//Setup platform specific helpers
import sharedTwine, { Platform } from '@inmar/twine-core'
import BrowserPlatform from './platform/index.js'
Platform.setPlatform(new BrowserPlatform())

// const sharedTwine = require('@inmar/twine-core/src')

const extendedTwine = {
  ...sharedTwine
}

export default extendedTwine
// export default sharedTwine