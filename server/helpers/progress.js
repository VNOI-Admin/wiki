const _ = require('lodash')

/* global WIKI */

/**
 * Progress tracking — server-side helpers.
 *
 * The server owns the *status definitions* — the configurable list of statuses an
 * article can be in — which are injected into every page through the `siteConfig`
 * global.
 *
 * It also stores progress for logged-in readers: one JSON blob of records per user in
 * the `userProgress` table. Guests keep their progress in the browser only (see
 * client/modules/progress/).
 */

const statusIdRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/
const iconRegex = /^mdi-[a-z0-9]+(-[a-z0-9]+)*$/

const MAX_RECORDS = 10000

// -> Same id formats as server/models/roadmaps.js
const roadmapIdRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/
const nodeIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const urlRegex = /^https?:\/\//

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
  },

  MAX_RECORDS,

  /**
   * Normalize an untrusted record list into the canonical stored form.
   *
   * Never throws. Invalid entries are dropped, duplicates keep the newest, and the list
   * is capped at MAX_RECORDS (newest kept).
   *
   * @param {Array} rawRecords
   * @returns {Array} Page records { pageId, statusId, locale, path, title, updatedAt } and
   *   external roadmap node records { roadmapId, nodeId, statusId, title, url, updatedAt }
   */
  normalizeRecords (rawRecords) {
    if (!_.isArray(rawRecords)) { return [] }
    const byKey = {}
    rawRecords.forEach(raw => {
      if (!raw || typeof raw !== 'object') { return }
      const statusId = _.toLower(_.trim(String(_.get(raw, 'statusId', ''))))
      if (!statusIdRegex.test(statusId)) { return }
      const updatedAtRaw = Number(raw.updatedAt)
      const updatedAt = _.isFinite(updatedAtRaw) && updatedAtRaw > 0 ? Math.floor(updatedAtRaw) : 0
      const title = _.trim(String(_.get(raw, 'title', ''))).substring(0, 255)

      let key = null
      let record = null
      if (raw.roadmapId || raw.nodeId) {
        const roadmapId = String(_.get(raw, 'roadmapId', ''))
        const nodeId = _.toLower(String(_.get(raw, 'nodeId', '')))
        if (roadmapId.length > 64 || !roadmapIdRegex.test(roadmapId) || !nodeIdRegex.test(nodeId)) { return }
        const url = _.trim(String(_.get(raw, 'url', ''))).substring(0, 2048)
        key = `node:${roadmapId}/${nodeId}`
        record = { roadmapId, nodeId, statusId, title, url: urlRegex.test(url) ? url : '', updatedAt }
      } else {
        const pageId = Number(raw.pageId)
        if (!Number.isInteger(pageId) || pageId < 1) { return }
        key = String(pageId)
        record = {
          pageId,
          statusId,
          locale: _.trim(String(_.get(raw, 'locale', ''))).substring(0, 10),
          path: _.trim(String(_.get(raw, 'path', ''))).substring(0, 255),
          title,
          updatedAt
        }
      }

      const existing = byKey[key]
      if (!existing || record.updatedAt >= existing.updatedAt) {
        byKey[key] = record
      }
    })
    return _.orderBy(_.values(byKey), ['updatedAt'], ['desc']).slice(0, MAX_RECORDS)
  },

  /**
   * Merge two record lists by page id / roadmap node; the newer `updatedAt` wins.
   *
   * @param {Array} a
   * @param {Array} b
   * @returns {Array} Normalized merged records
   */
  mergeRecords (a, b) {
    return module.exports.normalizeRecords(_.concat(a || [], b || []))
  },

  /**
   * Load a user's stored progress records.
   *
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async loadUserRecords (userId) {
    const row = await WIKI.models.knex('userProgress').where('userId', userId).first()
    if (!row) { return [] }
    try {
      return module.exports.normalizeRecords(JSON.parse(row.data))
    } catch (err) {
      WIKI.logger.warn(`Stored progress for user ${userId} is not valid JSON, ignoring it`)
      return []
    }
  },

  /**
   * Replace a user's stored progress records (or merge into them).
   *
   * @param {number} userId
   * @param {Array} rawRecords Untrusted records
   * @param {Object} [opts]
   * @param {boolean} [opts.merge] Merge newer-wins into the stored records instead of replacing
   * @returns {Promise<Array>} The records now stored
   */
  async saveUserRecords (userId, rawRecords, { merge = false } = {}) {
    let records = module.exports.normalizeRecords(rawRecords)
    // -> knex 0.21.7 has no onConflict(), so upsert by hand inside a transaction
    return WIKI.models.knex.transaction(async trx => {
      const row = await trx('userProgress').where('userId', userId).first()
      if (merge && row) {
        let stored = []
        try {
          stored = JSON.parse(row.data)
        } catch (err) {}
        records = module.exports.mergeRecords(stored, records)
      }
      const data = { data: JSON.stringify(records), updatedAt: Date.now() }
      if (row) {
        await trx('userProgress').where('userId', userId).update(data)
      } else {
        await trx('userProgress').insert({ userId, ...data })
      }
      return records
    })
  }
}
