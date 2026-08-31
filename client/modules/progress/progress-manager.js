import Vue from 'vue'
import _ from 'lodash'
import Emitter from './emitter'
import { makeAliasKey, parsePagePath } from './page-path'

/**
 * The public API for progress tracking.
 *
 * Holds the single source of truth as a `Vue.observable` state object, so Vue components
 * can read it in computed properties while plain (non-Vue) code such as the link
 * decorator can read the same object directly. Nothing here touches localStorage or the
 * DOM — persistence is ProgressStorage's job, presentation is the components'.
 */
export default class ProgressManager {
  /**
   * @param {import('./progress-storage').default} storage
   * @param {import('./status-registry').default} registry
   */
  constructor (storage, registry) {
    this.storage = storage
    this.registry = registry
    this.emitter = new Emitter()

    this.state = Vue.observable(storage.load())

    this.storage.on(evt => {
      if (evt.type === 'external') {
        // -> Another tab wrote; adopt its state and let everyone re-render
        this.state.records = evt.state.records
        this.state.aliases = evt.state.aliases
        this.state.updatedAt = evt.state.updatedAt
        this.emit({ type: 'change', reason: 'external' })
      } else if (evt.type === 'error') {
        this.emit({ type: 'error', reason: evt.reason, error: evt.error })
      }
    })
  }

  /** @returns {boolean} Whether writes are reaching persistent storage */
  get isPersistent () {
    return this.storage.isPersistent
  }

  /**
   * Subscribe to manager events (`change`, `error`).
   *
   * @param {(evt: Object) => void} fn
   * @returns {() => void} Unsubscribe function
   */
  on (fn) {
    return this.emitter.on(fn)
  }

  /** @param {Object} evt */
  emit (evt) {
    this.emitter.emit(evt)
  }

  /** Persist current state and notify listeners. */
  persist (evt) {
    this.storage.save(this.state)
    this.emit(evt || { type: 'change' })
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  /**
   * @param {number} pageId
   * @returns {ProgressRecord|null}
   */
  getRecord (pageId) {
    if (!_.isFinite(pageId)) { return null }
    return this.state.records[String(pageId)] || null
  }

  /**
   * @param {number} pageId
   * @returns {StatusDefinition} The configured default when the page is untracked
   */
  getStatusByPageId (pageId) {
    const record = this.getRecord(pageId)
    return record ? this.registry.resolve(record.statusId) : this.registry.getDefault()
  }

  /**
   * Resolve a page path to its id via the alias index.
   *
   * @param {string} locale
   * @param {string} path
   * @returns {number|null} null when this path has never been seen
   */
  getPageIdByPath (locale, path) {
    const id = this.state.aliases[makeAliasKey(locale, path)]
    return _.isFinite(id) ? id : null
  }

  /**
   * Status for a page identified by path.
   *
   * Returns null (rather than the default status) when the path is unknown, so callers
   * can tell "untracked" apart from "never seen" — the link decorator renders nothing
   * in both cases, but the distinction matters for diagnostics.
   *
   * @param {string} href A page href, e.g. `/en/algo/dp#section`
   * @returns {StatusDefinition|null}
   */
  getStatusByHref (href) {
    const parsed = parsePagePath(href)
    if (!parsed) { return null }
    const pageId = this.getPageIdByPath(parsed.locale, parsed.path)
    if (pageId === null) { return null }
    const record = this.getRecord(pageId)
    return record ? this.registry.resolve(record.statusId) : null
  }

  /** @returns {ProgressRecord[]} All records, newest first */
  listRecords () {
    return _.orderBy(_.values(this.state.records), ['updatedAt'], ['desc'])
  }

  /** @returns {number} Number of tracked pages */
  get count () {
    return _.size(this.state.records)
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  /**
   * Point a page's alias at its current path, dropping any stale ones.
   *
   * Invariant: every record's `locale`/`path` has exactly one alias entry, and nothing
   * else does. A moved page keeps its id but changes path, so the old key has to go —
   * otherwise links to whatever now lives at that path would be marked.
   *
   * @param {number} id Page id
   * @param {string} locale
   * @param {string} path
   * @returns {boolean} Whether anything changed
   */
  registerAlias (id, locale, path) {
    if (!locale || !path) { return false }
    const key = makeAliasKey(locale, path)
    let changed = false

    _.forOwn({ ...this.state.aliases }, (aliasId, aliasKey) => {
      if (aliasId === id && aliasKey !== key) {
        Vue.delete(this.state.aliases, aliasKey)
        changed = true
      }
    })

    if (this.state.aliases[key] !== id) {
      Vue.set(this.state.aliases, key, id)
      changed = true
    }
    return changed
  }

  /**
   * Note that the reader is looking at (or listing) a page.
   *
   * Only does anything for pages that already have a record: an untracked page needs no
   * alias, since there is nothing to mark. This keeps the alias index the same size as
   * the record set, and means simply browsing the wiki never writes to storage.
   *
   * Its real job is repair — after a page is renamed or moved, this re-points the record
   * and its alias at the new path.
   *
   * @param {Object} page
   * @param {number} page.pageId
   * @param {string} page.locale
   * @param {string} page.path
   * @param {string} [page.title]
   */
  recordVisit ({ pageId, locale, path, title }) {
    const id = _.toInteger(pageId)
    if (!_.isFinite(id) || id < 1 || !locale || !path) { return }

    const record = this.getRecord(id)
    if (!record) { return }

    let changed = this.registerAlias(id, locale, path)

    if (record.locale !== locale || record.path !== path || (title && record.title !== title)) {
      record.locale = locale
      record.path = path
      if (title) { record.title = title }
      changed = true
    }

    if (changed) {
      this.persist({ type: 'change', reason: 'visit', pageId: id })
    }
  }

  /**
   * Set a page's status.
   *
   * Setting the default status deletes the record rather than storing a no-op, which
   * keeps the blob proportional to what the reader has actually tracked.
   *
   * @param {number} pageId
   * @param {string} statusId
   * @param {Object} [meta] locale/path/title, used when creating a new record
   */
  setStatus (pageId, statusId, meta = {}) {
    const id = _.toInteger(pageId)
    if (!_.isFinite(id) || id < 1) { return }
    const key = String(id)

    if (this.registry.isDefault(statusId)) {
      const existing = this.state.records[key]
      if (existing) {
        Vue.delete(this.state.records, key)
        // -> No record means no marker, so the alias has nothing left to serve
        Vue.delete(this.state.aliases, makeAliasKey(existing.locale, existing.path))
        this.persist({ type: 'change', reason: 'status', pageId: id })
      }
      return
    }

    const existing = this.state.records[key]
    const record = {
      pageId: id,
      statusId,
      locale: meta.locale || _.get(existing, 'locale', ''),
      path: meta.path || _.get(existing, 'path', ''),
      title: meta.title || _.get(existing, 'title', ''),
      updatedAt: Date.now()
    }
    Vue.set(this.state.records, key, record)
    this.registerAlias(id, record.locale, record.path)
    this.persist({ type: 'change', reason: 'status', pageId: id })
  }

  /**
   * Replace all data (import). Overwrites rather than merges, by design.
   *
   * @param {ProgressRecord[]} records
   */
  replaceAll (records) {
    const nextRecords = {}
    const nextAliases = {}

    records.forEach(record => {
      const id = _.toInteger(record.pageId)
      if (!_.isFinite(id) || id < 1 || !record.statusId) { return }
      nextRecords[String(id)] = {
        pageId: id,
        statusId: String(record.statusId),
        locale: String(record.locale || ''),
        path: String(record.path || ''),
        title: String(record.title || ''),
        updatedAt: _.toInteger(record.updatedAt) || Date.now()
      }
      // -> Rebuild the alias index from the export, so link markers work immediately
      //    for pages this browser has never visited.
      if (record.locale && record.path) {
        nextAliases[makeAliasKey(record.locale, record.path)] = id
      }
    })

    this.state.records = nextRecords
    this.state.aliases = nextAliases
    this.persist({ type: 'change', reason: 'import' })
  }

  /** Delete all progress data. */
  clearAll () {
    this.state.records = {}
    this.state.aliases = {}
    this.storage.clear()
    this.emit({ type: 'change', reason: 'clear' })
  }
}
