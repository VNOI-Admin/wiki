/**
 * The author lines at the top of an article show as one card.
 *
 * Most articles start with "Tác giả:" and "Reviewer:" lines, in several markdown shapes:
 * a plain line, a bold label followed by a list, or a list of labels. This wraps that run
 * of blocks in `.vn-byline` (styled in vnoi-contents.scss). The article source stays the same.
 */

const NAMES = '(tác giả|người viết|biên soạn|biên dịch|người dịch|dịch giả|authors?|reviewers?|người review|người duyệt|nguồn)'
// -> "Tác giả: Lê Anh Đức"
const LABEL = new RegExp(`^\\s*${NAMES}\\s*:`, 'i')
// -> "Tác giả:" or "Tác giả" alone, with the names in the list after it
const BARE = new RegExp(`^\\s*${NAMES}\\s*:?\\s*$`, 'i')
// -> The run starts in one of the first blocks after the title heading
const HEAD_BLOCKS = 4
// -> A long paragraph is article text, even when it starts with a label
const MAX_TEXT = 400

const isLabel = el => !!el && el.textContent.length < MAX_TEXT && (LABEL.test(el.textContent) || BARE.test(el.textContent))

/**
 * The number of blocks, from `el` on, that make one entry of the run (0: not an entry)
 */
function entrySize (el) {
  if (!el) { return 0 }
  if (el.tagName === 'P' && isLabel(el)) {
    // -> A label with no name takes the list after it
    const next = el.nextElementSibling
    const hasList = !!next && /^(UL|OL)$/.test(next.tagName)
    if (BARE.test(el.textContent)) { return hasList ? 2 : (LABEL.test(el.textContent) ? 1 : 0) }
    return 1
  }
  if (el.tagName === 'UL') {
    const items = Array.from(el.children)
    return items.length > 0 && items.every(li => isLabel(li.firstElementChild || li)) ? 1 : 0
  }
  return 0
}

/**
 * @param {Element} root The page contents
 */
export function wrapByline (root) {
  const body = root.children.length === 1 && root.firstElementChild.tagName === 'DIV' ? root.firstElementChild : root
  const blocks = Array.from(body.children)
  const start = blocks.length > 0 && /^H[12]$/.test(blocks[0].tagName) ? 1 : 0
  let first = -1
  for (let idx = start; idx < Math.min(blocks.length, start + HEAD_BLOCKS); idx++) {
    if (entrySize(blocks[idx]) > 0) {
      first = idx
      break
    }
  }
  if (first < 0) { return }
  const run = []
  for (let idx = first, size = entrySize(blocks[idx]); size > 0; size = entrySize(blocks[idx])) {
    run.push(...blocks.slice(idx, idx + size))
    idx += size
  }
  const card = document.createElement('div')
  card.className = 'vn-byline'
  body.insertBefore(card, run[0])
  run.forEach(el => card.appendChild(el))
}
