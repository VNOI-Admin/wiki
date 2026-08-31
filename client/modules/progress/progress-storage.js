import Emitter from './emitter'

export const STORAGE_KEY = 'wiki-progress:v1'
export const SCHEMA_VERSION = 1

/**
 * @typedef {Object} ProgressRecord
 * @property {number} pageId Numeric Wiki.js page id — the canonical key
 * @property {string} statusId Status id; preserved verbatim even if unconfigured
 * @property {string} locale Denormalized, so exports are readable and rebuild aliases
 * @property {string} path Denormalized page path
 * @property {string} title Denormalized page title, for human-legible exports
 * @property {number} updatedAt Epoch ms
 */

/**
 * @typedef {Object} ProgressState
 * @property {number} version Schema version, drives the migration chain
 * @property {number} updatedAt Epoch ms of last write
 * @property {Object.<string, ProgressRecord>} records Keyed by String(pageId)
 * @property {Object.<string, number>} aliases `locale/path` -> pageId
 */

/**
 * Migration chain. Key N upgrades a state at version N to version N+1.
 * @type {Object.<number, (state: Object) => Object>}
 */
const migrations = {}

/**
 * @returns {ProgressState} A valid, empty state
 */
function emptyState () {
  return { version: SCHEMA_VERSION, updatedAt: 0, records: {}, aliases: {} }
}

/**
 * The ONLY module permitted to touch window.localStorage for progress data.
 *
 * Everything else goes through ProgressManager. Keeping persistence behind this single
 * seam is what makes the storage backend (and its failure modes) replaceable.
 */
export default class ProgressStorage {
  /**
   * @param {Object} [opts]
   * @param {string} [opts.key] localStorage key
   * @param {number} [opts.debounceMs] Write coalescing window
   */
  constructor ({ key = STORAGE_KEY, debounceMs = 250 } = {}) {
    this.key = key
    this.debounceMs = debounceMs
    this.saveTimer = null
    this.pendingState = null
    this.emitter = new Emitter()

    // -> Some privacy modes throw on mere *access* to localStorage, not just on write.
    //    Probe once here so nothing downstream has to care.
    this.backend = ProgressStorage.probeBackend()
    this.isPersistent = this.backend !== null
    this.memoryValue = null

    if (this.isPersistent) {
      this.onStorageEvent = this.onStorageEvent.bind(this)
      window.addEventListener('storage', this.onStorageEvent)
    }
  }

  /**
   * @returns {Storage|null} Usable localStorage, or null when unavailable
   */
  static probeBackend () {
    try {
      const probeKey = `${STORAGE_KEY}:probe`
      window.localStorage.setItem(probeKey, '1')
      window.localStorage.removeItem(probeKey)
      return window.localStorage
    } catch (err) {
      console.warn('[progress] localStorage unavailable, progress will not persist', err)
      return null
    }
  }

  /**
   * Read and validate the stored state.
   *
   * Never throws: a corrupt blob is set aside under `<key>:corrupt` (so it can be
   * recovered by hand) and replaced with a fresh state, because throwing here would
   * happen during app boot.
   *
   * @returns {ProgressState}
   */
  load () {
    if (!this.isPersistent) {
      return this.memoryValue || emptyState()
    }

    let raw = null
    try {
      raw = this.backend.getItem(this.key)
    } catch (err) {
      return emptyState()
    }
    if (!raw) { return emptyState() }

    let parsed = null
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      return this.quarantine(raw, 'not valid JSON')
    }

    if (!parsed || typeof parsed !== 'object' || typeof parsed.records !== 'object' || !parsed.records) {
      return this.quarantine(raw, 'unexpected shape')
    }

    return this.migrate({
      version: Number(parsed.version) || SCHEMA_VERSION,
      updatedAt: Number(parsed.updatedAt) || 0,
      records: parsed.records || {},
      aliases: (parsed.aliases && typeof parsed.aliases === 'object') ? parsed.aliases : {}
    })
  }

  /**
   * Apply pending migrations to a loaded state.
   *
   * @param {ProgressState} state
   * @returns {ProgressState}
   */
  migrate (state) {
    let current = state
    while (current.version < SCHEMA_VERSION && migrations[current.version]) {
      current = migrations[current.version](current)
      current.version += 1
    }
    // -> A state from a *newer* schema than we understand: leave the stored blob alone
    //    rather than downgrading and destroying fields we don't know about.
    if (current.version > SCHEMA_VERSION) {
      console.warn(`[progress] stored data is schema v${current.version}, this build understands v${SCHEMA_VERSION}`)
    }
    return current
  }

  /**
   * Move an unreadable blob aside and start fresh.
   *
   * @param {string} raw The unreadable value
   * @param {string} reason Why it was rejected
   * @returns {ProgressState}
   */
  quarantine (raw, reason) {
    console.warn(`[progress] stored data is ${reason}; moving it to ${this.key}:corrupt and starting fresh`)
    try {
      this.backend.setItem(`${this.key}:corrupt`, raw)
    } catch (err) {
      // -> Quarantine is best-effort; never block boot over it
    }
    return emptyState()
  }

  /**
   * Persist state, coalescing rapid writes.
   *
   * @param {ProgressState} state
   */
  save (state) {
    this.pendingState = state
    if (this.saveTimer) { clearTimeout(this.saveTimer) }
    this.saveTimer = setTimeout(() => this.flush(), this.debounceMs)
  }

  /**
   * Write any pending state immediately.
   *
   * @returns {boolean} Whether the write reached persistent storage
   */
  flush () {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (!this.pendingState) { return this.isPersistent }

    const state = this.pendingState
    this.pendingState = null
    state.updatedAt = Date.now()

    if (!this.isPersistent) {
      this.memoryValue = state
      return false
    }

    try {
      this.backend.setItem(this.key, JSON.stringify(state))
      return true
    } catch (err) {
      // -> QuotaExceededError, or Safari private mode throwing on the first write.
      //    Degrade to in-memory for the rest of the session and tell the caller.
      console.warn('[progress] failed to persist progress data', err)
      this.isPersistent = false
      this.memoryValue = state
      this.emitter.emit({ type: 'error', reason: 'quota', error: err })
      return false
    }
  }

  /**
   * React to writes made by another tab on the same origin.
   *
   * @param {StorageEvent} evt
   */
  onStorageEvent (evt) {
    if (evt.key !== this.key) { return }
    this.emitter.emit({ type: 'external', state: this.load() })
  }

  /**
   * Subscribe to storage-level events (`external` writes and `error` conditions).
   *
   * @param {(evt: Object) => void} fn
   * @returns {() => void} Unsubscribe function
   */
  on (fn) {
    return this.emitter.on(fn)
  }

  /**
   * Remove all stored progress data.
   */
  clear () {
    this.pendingState = null
    this.memoryValue = null
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (!this.isPersistent) { return }
    try {
      this.backend.removeItem(this.key)
    } catch (err) {
      console.warn('[progress] failed to clear progress data', err)
    }
  }
}
