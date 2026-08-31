import _ from 'lodash'

/**
 * @typedef {Object} StatusDefinition
 * @property {string} id Stable slug persisted in records, e.g. 'reading'
 * @property {string} label Human label, shown in the menu and link tooltips
 * @property {string} icon MDI icon name, e.g. 'mdi-check-circle'
 * @property {string} color Vuetify color token, e.g. 'green'
 * @property {boolean} isDefault Whether this is the untracked/default status
 * @property {boolean} showMarker Whether links to a page in this status get a marker
 * @property {boolean} isUnknown True only for the synthetic placeholder (see resolve)
 */

/**
 * The configured set of statuses.
 *
 * Knows nothing about storage or pages — it only answers questions about the status
 * vocabulary itself, so adding a status stays a config change rather than a code change.
 */
export default class StatusRegistry {
  /**
   * @param {StatusDefinition[]} statuses Normalized statuses (server guarantees shape)
   */
  constructor (statuses) {
    this.statuses = statuses
    this.byId = _.keyBy(statuses, 'id')
    this.defaultStatus = _.find(statuses, 'isDefault') || statuses[0]
  }

  /**
   * Build a registry from the server-injected config.
   *
   * The server normalizes and guarantees at least one status with exactly one default
   * (server/helpers/progress.js), but we re-check here so a hand-edited config or an
   * older cached page can never leave the registry without a default.
   *
   * @param {Object} config `siteConfig.progress`
   * @returns {StatusRegistry}
   */
  static fromConfig (config) {
    let statuses = _.get(config, 'statuses', [])
    if (!_.isArray(statuses) || statuses.length < 1) {
      statuses = [{ id: 'none', label: 'Not Started', icon: 'mdi-circle-outline', color: 'grey', isDefault: true, showMarker: false }]
    }
    statuses = statuses.map(s => ({
      id: s.id,
      label: s.label,
      icon: s.icon,
      color: s.color,
      isDefault: s.isDefault === true,
      showMarker: s.showMarker === true,
      isUnknown: false
    }))
    if (!_.some(statuses, 'isDefault')) {
      statuses[0].isDefault = true
      statuses[0].showMarker = false
    }
    return new StatusRegistry(statuses)
  }

  /** @returns {StatusDefinition[]} All statuses, in configured order */
  list () {
    return this.statuses
  }

  /** @returns {StatusDefinition} The status meaning "untracked" */
  getDefault () {
    return this.defaultStatus
  }

  /**
   * Look up a status by id.
   *
   * Returns a synthetic placeholder rather than null for ids that are no longer
   * configured. Records keep their original statusId, so re-adding a deleted status in
   * the admin UI restores every record that referenced it.
   *
   * @param {string} statusId
   * @returns {StatusDefinition} Never null
   */
  resolve (statusId) {
    const status = this.byId[statusId]
    if (status) { return status }
    return {
      id: statusId,
      label: `Unknown (${statusId})`,
      icon: 'mdi-help-circle-outline',
      color: 'grey',
      isDefault: false,
      showMarker: false,
      isUnknown: true
    }
  }

  /**
   * @param {string} statusId
   * @returns {boolean} Whether this id is the configured default
   */
  isDefault (statusId) {
    return this.defaultStatus.id === statusId
  }
}
