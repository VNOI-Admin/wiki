import _ from 'lodash'

/**
 * Which roadmap the page sidebar shows, when a page belongs to several.
 *
 * We remember when the reader last used each roadmap (opened its page, followed one of
 * its links, picked it in the sidebar). Following a roadmap link stamps that roadmap
 * right before navigating, so "came from roadmap X" and "last used roadmap X" are the
 * same rule, and it needs no URL parameter or server round trip.
 */

const STORAGE_KEY = 'wiki-roadmap:lastUsed'
const MAX_ENTRIES = 50

function read () {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return _.isPlainObject(parsed) ? parsed : {}
  } catch (err) {
    return {}
  }
}

/**
 * Record that the reader is using this roadmap now.
 *
 * @param {string} roadmapId
 */
export function touchRoadmap (roadmapId) {
  if (!roadmapId) { return }
  const entries = read()
  entries[roadmapId] = Date.now()
  // -> Keep the map small: drop the least recently used roadmaps
  const kept = _.fromPairs(_.take(_.orderBy(_.toPairs(entries), 1, 'desc'), MAX_ENTRIES))
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kept))
  } catch (err) {
    // -> Storage blocked: the sidebar falls back to the first roadmap
  }
}

/**
 * Reader's progress status for a roadmap node.
 *
 * @param {Object} progress The `$progress` singleton
 * @param {string} roadmapId
 * @param {Object} node
 * @returns {Object} A status definition
 */
export function getNodeStatus (progress, roadmapId, node) {
  if (node.articlePath) {
    // -> The server resolves pageId; fall back to the alias index for pages
    //    created after the roadmap was rendered
    let pageId = node.pageId || null
    if (!pageId) {
      const slash = node.articlePath.indexOf('/')
      if (slash > 0) {
        pageId = progress.getPageIdByPath(node.articlePath.slice(0, slash), node.articlePath.slice(slash + 1))
      }
    }
    return pageId ? progress.getStatusByPageId(pageId) : progress.registry.getDefault()
  }
  if (node.externalUrl) {
    return progress.getStatusByNode(roadmapId, node.id)
  }
  return progress.registry.getDefault()
}

/**
 * Pick the roadmap to show among those containing the current page.
 *
 * @param {Array<{id: string}>} roadmaps Candidates, in admin sort order
 * @returns {Object|null} The most recently used candidate, else the first one
 */
export function pickRoadmap (roadmaps) {
  if (!roadmaps || roadmaps.length < 1) { return null }
  if (roadmaps.length === 1) { return roadmaps[0] }
  const entries = read()
  return _.maxBy(roadmaps, r => _.toFinite(entries[r.id])) || roadmaps[0]
}

// -> Status id that counts as done. Admins can rename it, not remove it.
export const DONE_STATUS = 'completed'

/**
 * @param {Object} node
 * @returns {boolean} Whether the node links outside the wiki
 */
export function isExternalNode (node) {
  return !node.articlePath && !!node.externalUrl
}

/**
 * @param {Object} node
 * @returns {string|null} The page or external link; null when the node has no article yet
 */
export function nodeHref (node) {
  if (node.articlePath) { return '/' + node.articlePath }
  return node.externalUrl || null
}

function nodeLocation (node) {
  const slash = node.articlePath ? node.articlePath.indexOf('/') : -1
  if (slash < 1) { return null }
  return { locale: node.articlePath.slice(0, slash), path: node.articlePath.slice(slash + 1) }
}

function nodePageId (progress, node) {
  const loc = nodeLocation(node)
  if (!loc) { return null }
  return node.pageId || progress.getPageIdByPath(loc.locale, loc.path)
}

/**
 * @param {Object} progress The `$progress` singleton
 * @param {string} roadmapId
 * @param {Object} node
 * @returns {boolean} Whether the reader can set a status on this node
 */
export function canSetNodeStatus (progress, roadmapId, node) {
  if (!progress.isEnabled) { return false }
  return !!nodePageId(progress, node) || (isExternalNode(node) && !!roadmapId)
}

/**
 * Set the reader's status for a roadmap node: on its page, or on the node for an external link.
 *
 * @param {Object} progress The `$progress` singleton
 * @param {string} roadmapId
 * @param {Object} node
 * @param {string} statusId
 */
export function setNodeStatus (progress, roadmapId, node, statusId) {
  const pageId = nodePageId(progress, node)
  if (pageId) {
    progress.setStatus(pageId, statusId, {
      ...nodeLocation(node),
      title: node.pageTitle || node.title
    })
  } else if (isExternalNode(node) && roadmapId) {
    progress.setNodeStatus(roadmapId, node.id, statusId, {
      title: node.title,
      url: node.externalUrl
    })
  }
}

/**
 * Done count of a list of nodes. Only nodes with a link count: a node without an
 * article has nothing to read. The rail and the roadmap page both use this.
 *
 * @param {Object} progress The `$progress` singleton
 * @param {string} roadmapId
 * @param {Object[]} nodes
 * @returns {{completed: number, total: number, percent: number}}
 */
export function nodeStats (progress, roadmapId, nodes) {
  const linked = nodes.filter(n => nodeHref(n))
  const completed = linked.filter(n => getNodeStatus(progress, roadmapId, n).id === DONE_STATUS).length
  return {
    completed,
    total: linked.length,
    percent: linked.length ? Math.round(100 * completed / linked.length) : 0
  }
}
