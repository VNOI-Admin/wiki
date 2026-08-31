const MARKER_CLASS = 'progress-marker'
const DECORATED_ATTR = 'data-progress-decorated'

/**
 * Annotate wiki page links inside a DOM subtree with the reader's status for the target.
 *
 * Works on plain DOM rather than mounting a Vue component per link: an article can
 * contain hundreds of links, and this runs again on every status change.
 *
 * Relies only on the classes the server renderer already emits (`is-internal-link`,
 * `is-valid-page` — see server/modules/rendering/html-core/renderer.js), so it needs no
 * change to the rendering pipeline and works on already-cached page HTML.
 *
 * @param {HTMLElement} root Subtree to scan
 * @param {import('./progress-manager').default} manager
 * @param {Object} [opts]
 * @param {boolean} [opts.enabled] When false, existing markers are removed
 */
export function decorateLinks (root, manager, { enabled = true } = {}) {
  if (!root || !root.querySelectorAll) { return }

  const links = root.querySelectorAll('a.is-internal-link.is-valid-page')

  links.forEach(link => {
    // -> Idempotent: this runs again on every change event, so clear first
    link.querySelectorAll(`.${MARKER_CLASS}`).forEach(el => el.remove())
    link.removeAttribute(DECORATED_ATTR)

    if (!enabled) { return }

    const status = manager.getStatusByHref(link.getAttribute('href'))
    if (!status || !status.showMarker) { return }

    link.appendChild(buildMarker(status))
    link.setAttribute(DECORATED_ATTR, status.id)
  })
}

/**
 * Remove every marker in a subtree.
 *
 * @param {HTMLElement} root
 */
export function undecorateLinks (root) {
  if (!root || !root.querySelectorAll) { return }
  root.querySelectorAll(`.${MARKER_CLASS}`).forEach(el => el.remove())
  root.querySelectorAll(`[${DECORATED_ATTR}]`).forEach(el => el.removeAttribute(DECORATED_ATTR))
}

/**
 * Build the marker element for a status.
 *
 * @param {StatusDefinition} status
 * @returns {HTMLElement}
 */
function buildMarker (status) {
  const marker = document.createElement('span')
  marker.className = `${MARKER_CLASS} progress-marker--${status.id}`
  // -> Native title gives the required hover text with no tooltip library, and
  //    aria-label carries the same text to screen readers.
  marker.setAttribute('title', status.label)
  marker.setAttribute('aria-label', status.label)
  marker.setAttribute('role', 'img')

  const icon = document.createElement('i')
  // -> `<color>--text` is a Vuetify palette utility class, so the configured color token
  //    ('green', 'blue-grey', ...) works without mapping it to a hex value here.
  icon.className = `mdi ${status.icon} ${status.color}--text`
  icon.setAttribute('aria-hidden', 'true')
  marker.appendChild(icon)

  return marker
}

export { MARKER_CLASS }
