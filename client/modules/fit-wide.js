/**
 * Wide elements of the page contents scroll inside themselves.
 *
 * KaTeX cannot break some inline formulas, and a raw HTML table has no `.table-container`
 * wrapper. On a narrow screen such an element can be wider than the text column, and then
 * the whole page scrolls sideways. This marks only those elements with `is-wide` (styled in
 * vnoi-contents.scss): every other element keeps its layout.
 */

const WIDE = 'is-wide'

/**
 * @param {Element} root The page contents
 * @returns {Function} Teardown
 */
export function fitWide (root) {
  const run = () => {
    const els = Array.from(root.querySelectorAll('.katex, table')).filter(el =>
      // -> Display formulas and wrapped tables scroll already; a formula in a table goes with its table
      !el.closest('.katex-display, .table-container') && !(el.classList.contains('katex') && el.closest('table'))
    )
    // -> Measure each element at its natural width
    els.forEach(el => el.classList.remove(WIDE))
    const edge = root.getBoundingClientRect().right + 1
    els.filter(el => el.getBoundingClientRect().right > edge).forEach(el => el.classList.add(WIDE))
  }

  let timer = null
  const onResize = () => {
    clearTimeout(timer)
    timer = setTimeout(run, 150)
  }

  run()
  // -> Widths change when the fonts load
  if (document.readyState !== 'complete') {
    window.addEventListener('load', run, { once: true })
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(run)
  }
  window.addEventListener('resize', onResize, { passive: true })

  return () => {
    clearTimeout(timer)
    window.removeEventListener('load', run)
    window.removeEventListener('resize', onResize)
  }
}
