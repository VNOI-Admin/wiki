import _ from 'lodash'
import ProgressStorage from './progress-storage'
import ProgressManager from './progress-manager'
import StatusRegistry from './status-registry'
import { decorateLinks, undecorateLinks } from './link-decorator'

/**
 * Client-side progress tracking.
 *
 * Readers mark each article Not Started / Reading / Completed / Skipped (or whatever the
 * admin has configured). Everything lives in the reader's browser — no account, no
 * server storage, no sync — so it works for anonymous readers and offline.
 *
 * Layering (see docs in each module):
 *   StatusRegistry   the configured status vocabulary
 *   ProgressStorage  the only localStorage caller
 *   ProgressManager  business logic and the public API
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
    state: { records: {}, aliases: {} },
    count: 0,
    registry,
    getRecord: () => null,
    getStatusByPageId: () => registry.getDefault(),
    getPageIdByPath: () => null,
    getStatusByHref: () => null,
    listRecords: () => [],
    recordVisit: noop,
    setStatus: noop,
    replaceAll: noop,
    clearAll: noop,
    on: () => noop,
    emit: noop
  }
}

/**
 * Build the progress singleton from the server-injected config.
 *
 * @returns {Object} A ProgressManager, or a disabled stand-in
 */
export function createProgress () {
  const config = _.get(window, 'siteConfig.progress', {})
  const registry = StatusRegistry.fromConfig(config)

  if (config.isEnabled === false) {
    const disabled = createDisabledManager(registry)
    disabled.config = config
    return disabled
  }

  const storage = new ProgressStorage()
  const manager = new ProgressManager(storage, registry)
  manager.isEnabled = true
  manager.config = {
    isEnabled: true,
    showLinkMarkers: config.showLinkMarkers !== false
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
  install (Vue) {
    const progress = createProgress()

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
