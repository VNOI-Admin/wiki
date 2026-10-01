const _ = require('lodash')

/* global WIKI */

/**
 * Header links — admin-defined links shown in the top navbar.
 *
 * Stored as an array under the `headerLinks` config key and injected into every page
 * through the `siteConfig` global, so they are normalized before saving and on read.
 */

const MAX_LINKS = 50
const MAX_NAME_LENGTH = 100
const MAX_URL_LENGTH = 2000

// -> Absolute http(s) URLs or site-relative paths. Protocol-relative URLs ("//host")
//    and other schemes (javascript:, data:, ...) are rejected.
const urlRegex = /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i

module.exports = {
  MAX_LINKS,

  /**
   * Normalize an untrusted link list. Never throws: invalid entries are dropped.
   *
   * @param {Array} links Raw links ({ name, url, order })
   * @returns {Array} Valid links sorted by order (ties keep their input order)
   */
  normalizeLinks (links) {
    if (!_.isArray(links)) { return [] }
    const result = []
    for (const link of links) {
      if (!_.isPlainObject(link)) { continue }
      const name = _.trim(_.toString(link.name)).substring(0, MAX_NAME_LENGTH)
      const url = _.trim(_.toString(link.url))
      if (!name || url.length > MAX_URL_LENGTH || !urlRegex.test(url)) { continue }
      const order = _.toSafeInteger(link.order)
      result.push({ name, url, order })
      if (result.length >= MAX_LINKS) { break }
    }
    return _.sortBy(result, 'order')
  },

  /**
   * @returns {Array} The configured header links, normalized and sorted
   */
  getLinks () {
    return module.exports.normalizeLinks(_.get(WIKI.config, 'headerLinks', []))
  }
}
