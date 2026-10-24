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
// -> Difficulty levels: 1 to 5 stars
const LEVELS = 5
// -> Seconds. A listed page can be created or unpublished without an edit of the catalogue page.
const CACHE_TTL = 10 * 60

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
 * @param {string} href An internal catalogue link
 * @returns {string} The page path, without the leading slash, query and hash
 */
function hrefPath (href) {
  return href.replace(/^\//, '').replace(/[?#].*$/, '')
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
        stars: Math.min(stars, LEVELS),
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

  return { legend: _.times(LEVELS, i => legend[i] || ''), topics, items }
}

/**
 * Catalogue for a locale, with each internal article matched to its page.
 * Cached per page version: an edit of the catalogue page changes `updatedAt`.
 *
 * @param {Object} page The catalogue page (id, localeCode, updatedAt; content is optional)
 * @returns {Promise<Object>} parseCatalog() output; items also get pageId and createdAt
 */
async function getCatalog (page) {
  const key = `catalog:${page.id}:${page.updatedAt}`
  const hit = WIKI.cache.get(key)
  if (hit) { return hit }

  // -> The page cache keeps no source, so read it on a cache miss
  let content = page.content
  if (!_.isString(content)) {
    const row = await WIKI.models.pages.query().select('content').findById(page.id)
    content = row ? row.content : ''
  }
  const catalog = parseCatalog(content)
  const paths = _.uniq(catalog.items
    .filter(it => it.href.startsWith('/'))
    .map(it => hrefPath(it.href)))
  const pages = paths.length < 1 ? [] : await WIKI.models.pages.query()
    .select('id', 'path', 'createdAt')
    .where('localeCode', page.localeCode)
    .where('isPublished', true)
    .whereIn('path', paths)
  const byPath = _.keyBy(pages, 'path')
  for (const it of catalog.items) {
    const found = byPath[hrefPath(it.href)]
    it.pageId = found ? found.id : null
    it.createdAt = found ? found.createdAt : null
  }

  WIKI.cache.set(key, catalog, CACHE_TTL)
  return catalog
}

/**
 * What the Home page shows from the catalogue: the topics of the first part, with a
 * count per difficulty, and the newest articles by page creation date.
 *
 * @param {Object} catalog getCatalog() output
 * @param {number} newestCount
 * @returns {{topics: Object[], newest: Object[], topicOf: Object}}
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
      spread: _.times(LEVELS, k => list.filter(it => it.stars === k + 1).length)
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
  // -> The topic of each listed page, for the "Đang đọc" rows. A page listed twice keeps its first topic.
  const topicOf = {}
  for (const it of catalog.items) {
    if (it.pageId && !topicOf[it.pageId]) {
      topicOf[it.pageId] = _.get(catalog.topics, [it.topic, 'name'], '')
    }
  }
  return { topics, newest, topicOf }
}

/**
 * Where an article sits in the catalogue: its topic and level, and every topic with its
 * articles, for the article rail and the previous and next links.
 *
 * @param {Object} catalog getCatalog() output
 * @param {number} pageId
 * @returns {Object|null} { group: { name, filter }, stars, topics: [{ name, items: [{ title, path, pageId }] }] };
 *   null when the catalogue does not list the page. A page listed twice takes its first place.
 */
function articleContext (catalog, pageId) {
  const own = _.find(catalog.items, ['pageId', pageId])
  if (!own) { return null }
  const topics = catalog.topics
    .map((t, i) => ({
      name: t.name,
      items: _.uniqBy(catalog.items.filter(it => it.topic === i && it.pageId), 'pageId')
        .map(it => ({ title: it.title, path: hrefPath(it.href), pageId: it.pageId }))
    }))
    .filter(t => t.items.length > 0)
  // -> The catalogue filter that lists the article's group: its topic in the first part, else its part
  const topic = catalog.topics[own.topic]
  const inFirstPart = topic.part === catalog.topics[0].part
  return {
    group: inFirstPart ? { name: topic.name, filter: `t:${topic.name}` } : { name: topic.part, filter: `p:${topic.part}` },
    stars: own.stars,
    topics
  }
}

/**
 * @param {string} locale
 * @returns {Promise<Object|null>} The catalogue of this locale; null when it has no catalogue page
 */
async function getLocaleCatalog (locale) {
  const listPage = await WIKI.models.pages.query()
    .select('id', 'localeCode', 'updatedAt')
    .where({ path: CATALOG_PATH, localeCode: locale })
    .first()
  return listPage ? getCatalog(listPage) : null
}

/**
 * @param {string} locale
 * @param {number} pageId
 * @returns {Promise<Object|null>} articleContext() for this page
 */
async function getArticleContext (locale, pageId) {
  const catalog = await getLocaleCatalog(locale)
  return catalog ? articleContext(catalog, pageId) : null
}

/**
 * Data for the Home dashboard.
 *
 * @param {string} locale
 * @returns {Promise<{topics: Object[], newest: Object[], topicOf: Object, roadmaps: Object[]}>}
 *   roadmaps: those with an article in this locale; the client picks one
 */
async function getHome (locale) {
  const catalog = await getLocaleCatalog(locale)
  const summary = catalog ? homeSummary(catalog) : { topics: [], newest: [], topicOf: {} }
  const roadmaps = (await WIKI.models.roadmaps.getIndex())
    .filter(r => _.some(r.sections, s => _.some(s.nodes, n => _.startsWith(n.articlePath, `${locale}/`))))
  return { ...summary, roadmaps }
}

/**
 * What the search dialog ranks on the client: every catalogue title, and every roadmap item.
 *
 * @param {Object|null} catalog getCatalog() output
 * @param {Object[]} roadmaps Roadmaps.getIndex() output for this locale
 * @returns {{articles: Object[], roadmapItems: Object[]}}
 *   articles: { title, href, pageId, stars, topic }, one per link.
 *   roadmapItems: { title, href, roadmapId, roadmapTitle, stage, stageTitle }; href is null
 *   when the item has no article yet.
 */
function searchIndex (catalog, roadmaps) {
  const articles = !catalog ? [] : _.uniqBy(catalog.items, 'href').map(it => ({
    title: it.title,
    href: it.href,
    pageId: it.pageId || null,
    stars: it.stars,
    topic: _.get(catalog.topics, [it.topic, 'name'], '')
  }))
  const roadmapItems = _.flatMap(roadmaps, r => _.flatMap(r.sections, (s, si) => s.nodes.map(n => ({
    title: n.title,
    href: n.articlePath ? `/${n.articlePath}` : (n.externalUrl || null),
    roadmapId: r.id,
    roadmapTitle: r.title,
    stage: si + 1,
    stageTitle: s.title
  }))))
  return { articles, roadmapItems }
}

/**
 * @param {string} locale
 * @param {boolean} canReadCatalog Whether the reader may read the catalogue page
 * @returns {Promise<Object>} searchIndex() for this locale
 */
async function getSearchIndex (locale, canReadCatalog) {
  const catalog = canReadCatalog ? await getLocaleCatalog(locale) : null
  const roadmaps = (await WIKI.models.roadmaps.getIndex())
    .filter(r => _.some(r.sections, s => _.some(s.nodes, n => _.startsWith(n.articlePath, `${locale}/`))))
  return searchIndex(catalog, roadmaps)
}

module.exports = {
  CATALOG_PATH,
  articleContext,
  getArticleContext,
  getSearchIndex,
  searchIndex,
  homeSummary,
  getHome,
  cleanText,
  normalizeHref,
  parseCatalog,
  getCatalog
}
