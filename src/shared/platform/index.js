/**
 * It is expected that this object will hold any implementation specific helper functions.
 */
let platform = null

module.exports = {
  /**
   *
   * @returns {AbstractPlatform}
   */
  getPlatform() {
    if (!platform) {
      throw new Error('A call was made to Platform.getPlatform before the Platform had been set!')
    }

    return platform
  },

  /**
   *
   * @param {AbstractPlatform} platform
   */
  setPlatform(platform) {

  }
}