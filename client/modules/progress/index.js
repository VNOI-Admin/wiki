import _ from 'lodash'
import i18next from 'i18next'
import ProgressStorage, { STORAGE_KEY } from './progress-storage'
import ProgressManager from './progress-manager'
import StatusRegistry from './status-registry'
import AccountSync from './account-sync'
import { decorateLinks, undecorateLinks } from './link-decorator'

/**
 * Client-side progress tracking.
 *
 * Readers mark each article Not Started / Reading / Completed / Skipped (or whatever the
 * admin has configured). Guests keep everything in their browser. Logged-in readers
 * have it saved to their account (synced across devices), with a per-user copy in the
 * browser as an offline cache.
 *
 * Layering (see docs in each module):
 *   StatusRegistry   the configured status vocabulary
 *   ProgressStorage  the only localStorage caller
 *   ProgressManager  business logic and the public API
 *   AccountSync      the only server caller, for logged-in readers
 *   LinkDecorator    DOM annotation of links to tracked pages
 *   ImportExport     JSON exchange format
 */

/**
 * A manager stand-in used when the feature is disabled.
 *
 * Reads answer as "untracked" and writes do nothing, so callers need no feature checks.
 * Crucially it never clears storage: disabling the feature must not destroy data.
 *
 * @param {StatusRegistry} registry
 * @returns {Object}
 */
function createDisabledManager (registry) {
  const noop = () => {}
  return {
    isEnabled: false,
    isPersistent: false,
    isAccountBacked: false,
    sync: null,
    state: { records: {}, aliases: {} },
    count: 0,
    registry,
    getRecord: () => null,
    getStatusByPageId: () => registry.getDefault(),
    getStatusByNode: () => registry.getDefault(),
    getPageIdByPath: () => null,
    getStatusByHref: () => null,
    listRecords: () => [],
    recordVisit: noop,
    setStatus: noop,
    setNodeStatus: noop,
    replaceAll: noop,
    adopt: noop,
    clearAll: noop,
    on: () => noop,
    emit: noop
  }
}

const LOGIN_HINT_KEY = 'wiki-progress:loginHintShown'

/**
 * Pages tagged with this get no progress tracker (e.g. the home page, index pages).
 */
export const NO_PROGRESS_TAG = 'no-progress'

/**
 * @param {Array<{tag: string}>} tags The page's tags
 * @returns {boolean} Whether the page opted out of progress tracking
 */
export function isProgressExcluded (tags) {
  return _.some(tags, t => _.get(t, 'tag', t) === NO_PROGRESS_TAG)
}

/**
 * When a guest changes a status, suggest logging in to sync across devices.
 * Shown once per browser session, so it doesn't nag on every click.
 *
 * @param {Object} progress
 * @param {Object} store Vuex store
 */
function remindGuestToLogin (progress, store) {
  const unsubscribe = progress.on(evt => {
    if (evt.type !== 'change' || evt.reason !== 'status') { return }
    try {
      if (window.sessionStorage.getItem(LOGIN_HINT_KEY)) {
        unsubscribe()
        return
      }
      window.sessionStorage.setItem(LOGIN_HINT_KEY, '1')
    } catch (err) {
      // -> sessionStorage blocked: still show it, but only once for this page
    }
    unsubscribe()
    store.commit('showNotification', {
      message: i18next.t('common:progress.loginToSync', 'Log in to sync your progress across devices.'),
      style: 'primary',
      icon: 'account-sync'
    })
  })
}

/**
 * Build the progress singleton from the server-injected config.
 *
 * @param {Object} [user] The logged-in reader, from the `user` store
 * @param {boolean} [user.authenticated]
 * @param {number} [user.id]
 * @returns {Object} A ProgressManager, or a disabled stand-in
 */
export function createProgress (user = {}) {
  const config = _.get(window, 'siteConfig.progress', {})
  const registry = StatusRegistry.fromConfig(config)

  if (config.isEnabled === false) {
    const disabled = createDisabledManager(registry)
    disabled.config = config
    return disabled
  }

  // -> Guest id is 2; it never has an account to sync with
  const userId = _.toInteger(user.id)
  const isAccountBacked = user.authenticated === true && userId > 0 && userId !== 2

  const storage = new ProgressStorage(isAccountBacked ? { key: `${STORAGE_KEY}:user:${userId}` } : {})
  const manager = new ProgressManager(storage, registry)
  manager.isEnabled = true
  manager.isAccountBacked = isAccountBacked
  manager.config = {
    isEnabled: true,
    showLinkMarkers: config.showLinkMarkers !== false
  }

  manager.sync = null
  if (isAccountBacked) {
    manager.sync = new AccountSync({ manager, userId })
    manager.sync.start()
  }
  return manager
}

export default {
  /**
   * Install as a Vue plugin, exposing the singleton as `this.$progress`.
   * Mirrors the existing `$helpers` plugin in client/helpers/index.js.
   *
   * @param {Object} Vue
   */
  install (Vue, { store } = {}) {
    const progress = createProgress(store ? store.state.user : {})

    /**
     * Decorate every wiki link in a subtree with the reader's status for the target,
     * and keep it in sync as statuses change.
     *
     * @param {HTMLElement} root
     * @returns {() => void} Teardown function
     */
    progress.decorate = function (root) {
      const enabled = progress.isEnabled && progress.config.showLinkMarkers
      if (!enabled) {
        undecorateLinks(root)
        return () => {}
      }
      const run = () => decorateLinks(root, progress, { enabled: true })
      run()
      return progress.on(evt => {
        if (evt.type === 'change') { run() }
      })
    }

    if (store && progress.isEnabled && !progress.isAccountBacked) {
      remindGuestToLogin(progress, store)
    }

    Vue.$progress = progress
    Object.defineProperties(Vue.prototype, {
      $progress: {
        get () {
          return progress
        }
      }
    })
  }
}
