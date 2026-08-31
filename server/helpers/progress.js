const _ = require('lodash')

/* global WIKI */

/**
 * Client-side progress tracking — server-side config helpers.
 *
 * Progress data itself never touches the server: it lives entirely in the reader's
 * browser (see client/modules/progress/). What the server owns is the *status
 * definitions* — the configurable list of statuses an article can be in — which are
 * injected into every page through the `siteConfig` global.
 */

const statusIdRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/
const iconRegex = /^mdi-[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Seed statuses, applied when no statuses have been configured yet.
 *
 * These deliberately do NOT live in server/app/data.yml: config from the DB is merged
 * over the data.yml defaults with _.defaultsDeep, which merges arrays element-wise, so
 * a non-empty default array would resurrect statuses an admin had deleted.
 */
const defaultStatuses = [
  { id: 'none', label: 'Not Started', icon: 'mdi-circle-outline', color: 'grey', isDefault: true, showMarker: false },
  { id: 'reading', label: 'Reading', icon: 'mdi-book-open-blank-variant', color: 'orange', isDefault: false, showMarker: true },
  { id: 'completed', label: 'Completed', icon: 'mdi-check-circle', color: 'green', isDefault: false, showMarker: true },
  { id: 'skipped', label: 'Skipped', icon: 'mdi-chevron-double-right', color: 'blue', isDefault: false, showMarker: true }
]

module.exports = {
  defaultStatuses,

  /**
   * Normalize a raw status list into a safe, canonical form.
   *
   * Never throws and never returns an empty list: a malformed list would be injected
   * into siteConfig on every page and would break the client boot. Invalid entries are
   * dropped, and an entirely unusable list falls back to the seed statuses.
   *
   * @param {Array} rawStatuses Untrusted status list (from the admin UI or the DB)
   * @returns {Array} Canonical status list, at least one entry, exactly one isDefault
   */
  normalizeStatuses (rawStatuses) {
    let statuses = _.isArray(rawStatuses) ? rawStatuses : []

    statuses = _.reduce(statuses, (result, status) => {
      const id = _.toLower(_.trim(_.get(status, 'id', '')))
      if (!statusIdRegex.test(id) || _.some(result, ['id', id])) {
        return result
      }
      const icon = _.trim(_.get(status, 'icon', ''))
      result.push({
        id,
        label: _.trim(_.get(status, 'label', '')) || _.startCase(id),
        icon: iconRegex.test(icon) ? icon : 'mdi-circle-outline',
        color: _.trim(_.get(status, 'color', '')) || 'grey',
        isDefault: _.get(status, 'isDefault', false) === true,
        showMarker: _.get(status, 'showMarker', true) === true
      })
      return result
    }, [])

    if (statuses.length < 1) {
      statuses = _.cloneDeep(defaultStatuses)
    }

    // -> Exactly one default, whether the client sent none or several
    const defaultIdx = _.findIndex(statuses, ['isDefault', true])
    statuses.forEach((status, idx) => {
      status.isDefault = (idx === (defaultIdx >= 0 ? defaultIdx : 0))
    })

    // -> The default status marks "untracked", so it never decorates a link
    statuses[defaultIdx >= 0 ? defaultIdx : 0].showMarker = false

    return statuses
  },

  /**
   * Read the effective progress config, with statuses normalized and seeded.
   *
   * @returns {Object} { isEnabled, showLinkMarkers, statuses }
   */
  getConfig () {
    const config = _.get(WIKI.config, 'progress', {})
    return {
      isEnabled: _.get(config, 'isEnabled', true) === true,
      showLinkMarkers: _.get(config, 'showLinkMarkers', true) === true,
      statuses: module.exports.normalizeStatuses(_.get(config, 'statuses', []))
    }
  }
}
