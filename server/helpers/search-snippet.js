/**
 * Search result excerpts.
 *
 * The search engine cuts a window of the page source around the first match.
 * This helper turns that window of markdown into one line of readable text.
 */

// -> Characters before the match in the SQL window (see the MariaDB engine)
const LEAD = 80
// -> Characters of the window
const SIZE = 260
// -> Characters kept in the excerpt
const MAX = 180

/**
 * @param {string} q Search query
 * @returns {string} The longest word of the query: it matches the fewest places
 */
function pickTerm (q) {
  return String(q || '').trim().split(/\s+/).reduce((best, w) => w.length > best.length ? w : best, '')
}

/**
 * Remove markdown and HTML markup, and keep the text.
 *
 * @param {string} md
 * @returns {string}
 */
function stripMarkdown (md) {
  return String(md || '')
    .replace(/<!--[\s\S]*?(-->|$)/g, ' ')
    .replace(/<[^>]*>?/g, ' ')
    // -> Footnote marks: [^[1]^](link), ^[1]^ and [^1]
    .replace(/\[\^\[[^\]]*\]\^\](\([^)]*\)?)?/g, '')
    .replace(/\^\[[^\]]*\]\^|\[\^[^\]]*\]/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)?/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)?/g, '$1')
    .replace(/\{[.#][^}]*\}/g, ' ')
    .replace(/^\s*(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, ' ')
    // -> Underscores inside TeX (a_i) stay; only _emphasis_ goes
    .replace(/(^|\s)_{1,2}(\S[^_]*?)_{1,2}(?=[\s.,;:!?]|$)/g, '$1$2')
    .replace(/[|*`~]+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string} raw Window of the page source (SUBSTRING of SIZE characters)
 * @param {number} start 1-based position of the window in the page (SQL GREATEST(1, LOCATE - LEAD))
 * @returns {string} One line of text, with "…" where the window cuts a sentence
 */
function makeSnippet (raw, start = 1) {
  if (!raw) { return '' }
  let text = String(raw)
  const cutHead = start > 1
  const cutTail = text.length >= SIZE
  // -> Drop the partial words at the cut edges
  if (cutHead) { text = text.replace(/^\S*\s+/, '') }
  if (cutTail) { text = text.replace(/\s+\S*$/, '') }
  text = stripMarkdown(text)
  if (!text) { return '' }
  let tail = cutTail
  if (text.length > MAX) {
    text = text.slice(0, MAX).replace(/\s+\S*$/, '')
    tail = true
  }
  return `${cutHead ? '… ' : ''}${text}${tail ? ' …' : ''}`
}

module.exports = {
  LEAD,
  SIZE,
  pickTerm,
  stripMarkdown,
  makeSnippet
}
