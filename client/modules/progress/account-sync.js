import Vue from 'vue'
import _ from 'lodash'
import gql from 'graphql-tag'
import ProgressStorage, { STORAGE_KEY } from './progress-storage'
import { recordKey } from './progress-manager'

const QUERY_MINE = gql`
  query {
    progress {
      mine
    }
  }
`

const MUTATION_SAVE = gql`
  mutation ($records: String!, $merge: Boolean) {
    progress {
      save(records: $records, merge: $merge) {
        responseResult {
          succeeded
          message
        }
        records
      }
    }
  }
`

/**
 * Merge two record lists by record key; the newer `updatedAt` wins.
 *
 * @param {ProgressRecord[]} a
 * @param {ProgressRecord[]} b
 * @returns {ProgressRecord[]}
 */
export function mergeRecords (a, b) {
  const byId = {}
  _.concat(a || [], b || []).forEach(record => {
    const key = recordKey(record)
    if (!key) { return }
    const existing = byId[key]
    if (!existing || (record.updatedAt || 0) >= (existing.updatedAt || 0)) {
      byId[key] = record
    }
  })
  return _.values(byId)
}

/**
 * Keeps a logged-in reader's progress in sync with their account.
 *
 * The only progress module that talks to the server. The account is the source of
 * truth; the manager's storage (a per-user localStorage key) is just an offline cache.
 *
 * Server calls:
 *   start()  fetches the account's records once per page load, and merges in the guest
 *            progress of this browser the first time it is seen (newer wins)
 *   push()   replaces the account's records with the local ones, debounced, after any
 *            local change
 *
 * A `dirty` flag is persisted next to the cache while local changes have not reached
 * the server, so changes made offline (or just before leaving the page) are merged in
 * on the next start().
 */
export default class AccountSync {
  /**
   * @param {Object} opts
   * @param {import('./progress-manager').default} opts.manager
   * @param {number} opts.userId
   * @param {() => Object} [opts.getClient] Returns the Apollo client
   * @param {number} [opts.debounceMs] Push coalescing window
   */
  constructor ({ manager, userId, getClient = () => window.graphQL, debounceMs = 1000 }) {
    this.manager = manager
    this.userId = userId
    this.getClient = getClient
    this.debounceMs = debounceMs

    this.mergedKey = `${STORAGE_KEY}:merged:${userId}`
    this.dirtyKey = `${STORAGE_KEY}:user:${userId}:dirty`

    this.ready = false
    this.starting = null
    this.pushing = null
    this.pushTimer = null
    this.changeCount = 0

    // -> Observable, so the data dialog can show sync errors
    this.status = Vue.observable({ state: 'idle', error: null })

    this.manager.on(evt => this.onManagerEvent(evt))

    this.retry = this.retry.bind(this)
    window.addEventListener('online', this.retry)
    document.addEventListener('visibilitychange', this.retry)
  }

  // ---------------------------------------------------------------------------
  // Persisted flags (best-effort: storage may be unavailable)
  // ---------------------------------------------------------------------------

  getFlag (key) {
    try {
      return window.localStorage.getItem(key)
    } catch (err) {
      return null
    }
  }

  setFlag (key, value) {
    try {
      if (value === null) {
        window.localStorage.removeItem(key)
      } else {
        window.localStorage.setItem(key, value)
      }
    } catch (err) {}
  }

  get isDirty () {
    return this.getFlag(this.dirtyKey) === '1'
  }

  set isDirty (value) {
    this.setFlag(this.dirtyKey, value ? '1' : null)
  }

  // ---------------------------------------------------------------------------
  // Server calls
  // ---------------------------------------------------------------------------

  async fetchMine () {
    const resp = await this.getClient().query({ query: QUERY_MINE, fetchPolicy: 'network-only' })
    const raw = _.get(resp, 'data.progress.mine', null)
    if (raw === null) {
      throw new Error('Not logged in')
    }
    return JSON.parse(raw)
  }

  async save (records, merge) {
    const resp = await this.getClient().mutate({
      mutation: MUTATION_SAVE,
      variables: { records: JSON.stringify(records), merge }
    })
    const result = _.get(resp, 'data.progress.save', {})
    if (!_.get(result, 'responseResult.succeeded', false)) {
      throw new Error(_.get(result, 'responseResult.message', 'Failed to save progress'))
    }
    return result.records ? JSON.parse(result.records) : records
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Load the account's records, merging in anything local that the account has not
   * seen yet. Never throws.
   *
   * @returns {Promise<void>}
   */
  start () {
    if (this.ready) { return Promise.resolve() }
    if (!this.starting) {
      this.starting = this.doStart().finally(() => { this.starting = null })
    }
    return this.starting
  }

  async doStart () {
    this.status.state = 'syncing'
    try {
      let records = await this.fetchMine()

      // -> Local records the account has not seen yet: this browser's guest progress
      //    (once per guest state), and cached changes that never reached the server
      let pending = []
      const guest = this.loadGuestState()
      const guestMarker = String(guest.updatedAt)
      const guestIsNew = _.size(guest.records) > 0 && this.getFlag(this.mergedKey) !== guestMarker
      if (guestIsNew) {
        pending = _.values(guest.records)
      }
      if (this.isDirty) {
        pending = mergeRecords(pending, this.manager.listRecords())
      }

      const snapshot = this.changeCount
      if (pending.length > 0) {
        records = await this.save(pending, true)
      }
      if (guestIsNew) {
        this.setFlag(this.mergedKey, guestMarker)
      }

      // -> The reader changed something while we were waiting on the server
      const changedMeanwhile = this.changeCount !== snapshot
      if (changedMeanwhile) {
        records = mergeRecords(records, this.manager.listRecords())
      }

      this.manager.adopt(records)
      this.ready = true
      this.status.state = 'idle'
      this.status.error = null

      if (changedMeanwhile) {
        this.schedulePush()
      } else {
        this.isDirty = false
      }
    } catch (err) {
      console.warn('[progress] failed to load progress from your account', err)
      this.status.state = 'error'
      this.status.error = err
      this.manager.emit({ type: 'error', reason: 'sync', error: err })
    }
  }

  /**
   * @returns {ProgressState} This browser's guest progress, read without subscribing
   */
  loadGuestState () {
    const storage = new ProgressStorage()
    const state = storage.load()
    storage.dispose()
    return state
  }

  /** @param {Object} evt Manager event */
  onManagerEvent (evt) {
    if (evt.type !== 'change') { return }
    // -> `account` came from the server, `external` was written (and pushed) by another tab
    if (evt.reason === 'account' || evt.reason === 'external') { return }
    this.changeCount += 1
    this.isDirty = true
    if (this.ready) {
      this.schedulePush()
    }
  }

  schedulePush () {
    if (this.pushTimer) { clearTimeout(this.pushTimer) }
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null
      this.push()
    }, this.debounceMs)
  }

  /**
   * Replace the account's records with the local ones. Never throws.
   *
   * @returns {Promise<void>}
   */
  async push () {
    if (!this.ready) { return }
    if (this.pushing) {
      // -> Another push is in flight; go again once it lands
      await this.pushing
      return this.push()
    }
    const snapshot = this.changeCount
    this.status.state = 'syncing'
    this.pushing = this.save(this.manager.listRecords(), false)
      .then(() => {
        if (this.changeCount === snapshot) {
          this.isDirty = false
        }
        this.status.state = 'idle'
        this.status.error = null
      })
      .catch(err => {
        console.warn('[progress] failed to save progress to your account', err)
        this.status.state = 'error'
        this.status.error = err
        this.manager.emit({ type: 'error', reason: 'sync', error: err })
      })
      .finally(() => { this.pushing = null })
    return this.pushing
  }

  /** Retry whatever failed, when the browser comes back online or into view. */
  retry () {
    if (document.visibilityState === 'hidden' || window.navigator.onLine === false) { return }
    if (!this.ready) {
      this.start()
    } else if (this.isDirty && !this.pushTimer && !this.pushing) {
      this.push()
    }
  }
}
