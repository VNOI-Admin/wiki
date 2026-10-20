const _ = require('lodash')

/* global WIKI */

/**
 * Article catalogue — the "Bài viết" view.
 *
 * Editors keep the list of articles as a normal markdown page (path `articles`). The
 * reader sees it as a catalogue with filters. This helper reads that page and does not
 * change it: the page stays the one source, and editing it updates the catalogue.
 *
 * Page shape:
 *   # Title                  (skipped)
 *   | ⭐⭐ | Meaning |        (difficulty legend table)
 *   ## Thuật toán            (an empty h2 right before another h2: a part label)
 *   ## Nhập môn              (a topic)
 *   ### Số học               (a sub-group of the topic)
 *   - **Số học cơ bản:**     (a sub-group, as a bold list item)
 *   - [Title - ⭐⭐](/path)   (an article; ⭐ count = difficulty)
 *   # Chia sẻ kinh nghiệm    (an h1 after the title starts a part)
 */

const CATALOG_PATH = 'articles'
const STAR = '⭐'
const CACHE_MAX = 10

const cache = new Map()

/**
 * Turn the markdown of a title into plain text: links, HTML, emoji codes and simple TeX.
 *
 * @param {string} text
 * @returns {string}
 */
function cleanText (text) {
  const plain = String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/:new:/g, '')
    .replace(/\\mathcal\{([^}]*)\}/g, '$1')
    .replace(/\\bmod\b/g, 'mod')
    .replace(/\^\{([^}]*)\}/g, '^$1')
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/[$*]/g, '')
    .split(STAR).join('')
  // -> "Chia căn -  - Phần I - " -> "Chia căn - Phần I"
  return plain
    .split(/(?<=^|\s)-(?=\s|$)/)
    .map(part => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' - ')
    .replace(/\s*:$/, '')
}

/**
 * @param {string} href
 * @returns {string} Site paths without a trailing `.md`; other links unchanged
 */
function normalizeHref (href) {
  const h = String(href || '').trim()
  if (/^\/(?!\/)/.test(h)) {
    return h.replace(/\.md(?=$|[?#])/i, '')
  }
  return h
}

/**
 * Parse the catalogue page.
 *
 * @param {string} markdown Page source
 * @returns {{legend: string[], topics: Object[], items: Object[]}}
 *   legend[i]: meaning of difficulty i + 1. topics: { name, part }, in page order.
 *   items: { title, href, stars, isNew, topic (index into topics), sub }
 */
function parseCatalog (markdown) {
  const legend = []
  const topics = []
  const items = []
  const lines = String(markdown || '').replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)

  let sawTitle = false
  let part = ''
  let topic = -1
  let sub = ''
  // -> Items and sub-groups seen under the current topic, to detect part labels
  let topicHasContent = false

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const text = cleanText(heading[2])
      if (level === 1) {
        if (!sawTitle) {
          sawTitle = true
          continue
        }
        part = text
        topic = -1
        sub = ''
        continue
      }
      if (level === 2) {
        // -> The previous h2 had nothing under it: it names a part, not a topic
        if (topic >= 0 && !topicHasContent && topic === topics.length - 1) {
          part = topics.pop().name
        }
        topics.push({ name: text, part })
        topic = topics.length - 1
        sub = ''
        topicHasContent = false
        continue
      }
      if (topic >= 0) {
        sub = text
        topicHasContent = true
      }
      continue
    }

    // -> Difficulty legend: | ⭐⭐ | Meaning |
    const row = /^\s*\|\s*((?:⭐)+)\s*\|\s*(.*?)\s*\|\s*$/.exec(line)
    if (row) {
      legend[row[1].length / STAR.length - 1] = cleanText(row[2])
      continue
    }

    // -> A bold list item names a sub-group: - **Số học cơ bản:**
    const group = /^\s*[-*]\s+\*\*(.+?)\*\*\s*:?\s*$/.exec(line)
    if (group && topic >= 0) {
      sub = cleanText(group[1])
      topicHasContent = true
      continue
    }

    // -> An article: - [Title - ⭐⭐](/path)
    const link = /^\s*[-*]\s+\[(.+)\]\(([^)\s]+)\)/.exec(line)
    if (link && topic >= 0) {
      const raw = link[1]
      const stars = (raw.match(new RegExp(STAR, 'g')) || []).length
      items.push({
        title: cleanText(raw),
        href: normalizeHref(link[2]),
        stars: Math.min(stars, 5),
        isNew: /:new:/.test(raw),
        topic,
        sub
      })
      topicHasContent = true
    }
  }

  // -> A trailing empty topic carries nothing to show
  if (topic >= 0 && !topicHasContent && topic === topics.length - 1) {
    topics.pop()
  }

  return { legend: _.times(5, i => legend[i] || ''), topics, items }
}

/**
 * Catalogue for a locale, with each internal article matched to its page.
 * Cached per page version: an edit of the catalogue page changes `updatedAt`.
 *
 * @param {Object} page The catalogue page (id, localeCode, updatedAt; content is optional)
 * @returns {Promise<Object>} parseCatalog() output; items also get pageId and createdAt
 */
async function getCatalog (page) {
  const key = `${page.id}:${page.updatedAt}`
  if (cache.has(key)) { return cache.get(key) }

  // -> The page cache keeps no source, so read it on a cache miss
  let content = page.content
  if (!_.isString(content)) {
    const row = await WIKI.models.pages.query().select('content').findById(page.id)
    content = row ? row.content : ''
  }
  const catalog = parseCatalog(content)
  const paths = _.uniq(catalog.items
    .filter(it => it.href.startsWith('/'))
    .map(it => it.href.replace(/^\//, '').replace(/[?#].*$/, '')))
  const pages = paths.length < 1 ? [] : await WIKI.models.pages.query()
    .select('id', 'path', 'createdAt')
    .where('localeCode', page.localeCode)
    .where('isPublished', true)
    .whereIn('path', paths)
  const byPath = _.keyBy(pages, 'path')
  for (const it of catalog.items) {
    const found = byPath[it.href.replace(/^\//, '').replace(/[?#].*$/, '')]
    it.pageId = found ? found.id : null
    it.createdAt = found ? found.createdAt : null
  }

  if (cache.size >= CACHE_MAX) { cache.delete(cache.keys().next().value) }
  cache.set(key, catalog)
  return catalog
}

/**
 * What the Home page shows from the catalogue: the topics of the first part, with a
 * count per difficulty, and the newest articles by page creation date.
 *
 * @param {Object} catalog getCatalog() output
 * @param {number} newestCount
 * @returns {{topics: Object[], newest: Object[]}}
 */
function homeSummary (catalog, newestCount = 4) {
  const firstPart = _.get(catalog, 'topics[0].part', '')
  const topics = []
  catalog.topics.forEach((t, i) => {
    if (t.part !== firstPart) { return }
    const list = catalog.items.filter(it => it.topic === i)
    topics.push({
      name: t.name,
      count: list.length,
      spread: _.times(5, k => list.filter(it => it.stars === k + 1).length)
    })
  })
  // -> One card per page, even when the list links it twice
  const newest = _.uniqBy(_.orderBy(catalog.items.filter(it => it.createdAt), [it => new Date(it.createdAt).getTime()], ['desc']), 'pageId')
    .slice(0, newestCount)
    .map(it => ({
      title: it.title,
      href: it.href,
      stars: it.stars,
      pageId: it.pageId,
      createdAt: it.createdAt,
      topic: _.get(catalog.topics, [it.topic, 'name'], '')
    }))
  return { topics, newest }
}

/**
 * Data for the Home dashboard.
 *
 * @param {string} locale
 * @returns {Promise<{topics: Object[], newest: Object[], roadmap: Object|null}>}
 */
async function getHome (locale) {
  const listPage = await WIKI.models.pages.query()
    .select('id', 'localeCode', 'updatedAt')
    .where({ path: CATALOG_PATH, localeCode: locale })
    .first()
  const summary = listPage ? homeSummary(await getCatalog(listPage)) : { topics: [], newest: [] }
  const roadmaps = await WIKI.models.roadmaps.getIndex()
  return { ...summary, roadmap: roadmaps[0] || null }
}

module.exports = {
  CATALOG_PATH,
  homeSummary,
  getHome,
  cleanText,
  normalizeHref,
  parseCatalog,
  getCatalog
}
