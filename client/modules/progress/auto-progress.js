import { DONE_STATUS, READING_STATUS } from '../roadmap-context'

/**
 * Auto progress for one article visit.
 *
 * The page becomes "reading" after a short look, and "done" when the reader reaches the
 * end of the text after a minimum reading time. Active time counts only while the tab is
 * visible. A status that the reader sets by hand stops it for this visit, and it never
 * lowers "done" or "skipped".
 */

// -> Seconds of active time before "reading"
const READING_AFTER = 10
// -> Minimum time for "done": 10% of the reading time at 250 words per minute, from 10 s to 90 s.
//    Readers skip parts, so the minimum stays low.
const WORDS_PER_MIN = 250
const DONE_SHARE = 0.1
const DONE_MIN = 10
const DONE_MAX = 90
// -> The end of the text counts as reached when it is this close above the screen bottom
const END_SLACK = 40
const TICK = 2
// -> Auto progress never lowers this status
const SKIPPED_STATUS = 'skipped'

/**
 * @param {number} words Words in the article
 * @returns {number} Seconds of active time before "done"
 */
export function doneAfter (words) {
  return Math.min(DONE_MAX, Math.max(DONE_MIN, words / WORDS_PER_MIN * 60 * DONE_SHARE))
}

/**
 * @param {Object} opts
 * @param {Object} opts.progress The progress manager (`this.$progress`)
 * @param {number} opts.pageId
 * @param {Object} opts.meta locale, path and title for a new record
 * @param {HTMLElement} opts.content The article text
 * @param {Function} [opts.onDone] Called when auto progress marks the page done
 * @returns {Function} Teardown
 */
export function startAutoProgress ({ progress, pageId, meta, content, onDone }) {
  const noop = () => {}
  if (!progress || !progress.isEnabled || !(pageId > 0) || !content) { return noop }
  // -> An admin can remove a status from the list: then auto progress has nothing to set
  const has = id => progress.registry.list().some(s => s.id === id)
  if (!has(READING_STATUS) || !has(DONE_STATUS)) { return noop }

  const min = doneAfter((content.textContent || '').split(/\s+/).filter(Boolean).length)
  let active = 0
  let manual = false
  let own = false

  const set = statusId => {
    own = true
    progress.setStatus(pageId, statusId, meta)
    own = false
  }

  const check = () => {
    if (manual) { return }
    const status = progress.getStatusByPageId(pageId).id
    if (status === DONE_STATUS || status === SKIPPED_STATUS) { return }
    const box = content.getBoundingClientRect()
    if (box.bottom <= window.innerHeight + END_SLACK && active >= min) {
      set(DONE_STATUS)
      if (onDone) { onDone() }
    } else if (progress.registry.isDefault(status) && (active >= READING_AFTER || box.top < 0)) {
      set(READING_STATUS)
    }
  }

  const timer = setInterval(() => {
    if (!document.hidden) { active += TICK }
    check()
  }, TICK * 1000)
  window.addEventListener('scroll', check, { passive: true })

  // -> A status change for this page that auto progress did not make is the reader's choice
  const off = progress.on(evt => {
    if (!own && evt.type === 'change' && evt.reason === 'status' && Number(evt.pageId) === Number(pageId)) {
      manual = true
    }
  })

  return () => {
    clearInterval(timer)
    window.removeEventListener('scroll', check)
    off()
  }
}
