/**
 * Rank the catalogue titles and the roadmap items for the search dialog, on the client.
 * The full-text search stays on the server; this part answers at once, and knows the
 * synonyms that competitive programmers use (dp = quy hoạch động, BIT = Fenwick).
 */

/**
 * Lowercase, and remove the Vietnamese marks of each character.
 * Each character stays one character, so a match position in the result is the same in the input.
 *
 * @param {string} text
 * @returns {string}
 */
export function foldText (text) {
  return Array.from(String(text || ''), c => {
    const f = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    if (f === 'đ') { return 'd' }
    // -> One UTF-16 unit per character, so indexOf positions match the Array.from positions
    return f.length === 1 ? f : '�'
  }).join('')
}

/**
 * @param {string} text
 * @returns {string} Folded words, one space apart
 */
export function normText (text) {
  return foldText(text).replace(/[^a-z0-9]+/g, ' ').trim()
}

// -> Common topics: shortcuts on Home and in the empty search dialog
export const POPULAR_TERMS = ['Quy hoạch động', 'DFS', 'Segment Tree', 'Fenwick', 'Dijkstra']

// -> Each group names one idea. A query that contains one name also matches the others.
const SYNONYMS = [
  ['bit', 'fenwick', 'binary indexed', 'chi so nhi phan'],
  ['dp', 'qhd', 'quy hoach dong'],
  ['segment tree', 'cay phan doan', 'segtree', 'it'],
  ['dsu', 'disjoint set', 'union find'],
  ['lca', 'lowest common ancestor', 'to tien chung'],
  ['mst', 'cay khung'],
  ['scc', 'lien thong manh'],
  ['dfs', 'chieu sau', 'depth first'],
  ['bfs', 'chieu rong', 'breadth first'],
  ['binary search', 'tim kiem nhi phan', 'chat nhi phan'],
  ['hash', 'bam'],
  ['fft', 'nhan nhanh da thuc'],
  ['shortest path', 'duong di ngan nhat', 'dijkstra'],
  ['bitmask', 'bit mask'],
  ['flow', 'luong'],
  ['sort', 'sap xep']
]

// -> A synonym this short must match a whole word: "it" must not match "bit"
const STRICT_LEN = 3

/**
 * @param {string} q Normalized query
 * @returns {Object[]} { q, weight, syn, strict }: the query, then its synonyms
 */
export function expandQuery (q) {
  const out = [{ q, weight: 1, syn: false, strict: false }]
  for (const group of SYNONYMS) {
    if (!group.some(s => q === s || (s.length > 2 && q.includes(s)))) { continue }
    for (const s of group) {
      if (s !== q && !out.some(o => o.q === s)) {
        out.push({ q: s, weight: 0.8, syn: true, strict: s.length <= STRICT_LEN })
      }
    }
  }
  return out
}

/**
 * @param {string} text Normalized text
 * @param {string} q Normalized query
 * @returns {number} 0 to 100
 */
function scoreText (text, q) {
  if (!q || !text) { return 0 }
  if (text === q) { return 100 }
  if (text.startsWith(q)) { return 70 }
  if ((` ${text} `).includes(` ${q} `)) { return 55 }
  if (text.includes(q)) { return 35 }
  const words = q.split(' ')
  const hit = words.filter(w => (` ${text}`).includes(` ${w}`)).length
  if (hit === words.length) { return 25 }
  return hit ? 8 * hit / words.length : 0
}

/**
 * @param {Object[]} queries expandQuery() output
 * @param {string[]} fields Normalized texts, most important first
 * @param {number[]} factors Weight of each field
 * @returns {{score: number, syn: string|null}} syn: the synonym that matched, when the query itself did not
 */
function rank (queries, fields, factors) {
  let best = 0
  let syn = null
  let direct = 0
  for (const o of queries) {
    const f = text => (o.strict && !(` ${text} `).includes(` ${o.q} `)) ? 0 : scoreText(text, o.q)
    const score = Math.max(...fields.map((text, i) => f(text) * factors[i])) * o.weight
    if (!o.syn) { direct = score }
    if (score > best) {
      best = score
      syn = o.syn ? o.q : null
    }
  }
  return { score: best, syn: direct > 0 ? null : syn }
}

// -> Weights of title, path and topic, and the least score that shows
const ARTICLE_FACTORS = [1, 0.75, 0.3]
const ARTICLE_MIN = 10
const ROADMAP_FACTORS = [1, 0.3]
const ROADMAP_MIN = 25

/**
 * @param {Object[]} articles { title, href, topic, ... }
 * @param {string} raw The query as typed
 * @param {number} limit
 * @returns {Object[]} { article, syn }, best first
 */
export function rankArticles (articles, raw, limit = 7) {
  const q = normText(raw)
  if (!q) { return [] }
  const queries = expandQuery(q)
  return articles
    .map(article => ({ article, ...rank(queries, [normText(article.title), normText(article.href), normText(article.topic)], ARTICLE_FACTORS) }))
    .filter(x => x.score >= ARTICLE_MIN)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ article, syn }) => ({ article, syn }))
}

/**
 * @param {Object[]} items { title, stageTitle, ... }
 * @param {string} raw The query as typed
 * @param {number} limit
 * @returns {Object[]} The items, best first
 */
export function rankRoadmapItems (items, raw, limit = 3) {
  const q = normText(raw)
  if (!q) { return [] }
  const queries = expandQuery(q)
  return items
    .map(item => ({ item, ...rank(queries, [normText(item.title), normText(item.stageTitle)], ROADMAP_FACTORS) }))
    .filter(x => x.score >= ROADMAP_MIN)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item)
}
