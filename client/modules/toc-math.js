/**
 * TOC entries for headings that hold math, read from the headings on the page.
 *
 * The stored TOC of a page rendered before math headings were handled has each formula as
 * text three times (MathML, TeX source, HTML) and no markup. The heading on the page always
 * has the typeset formula, so the TOC copies it from there.
 */

const MATH = '.katex, mjx-container'
const ZERO_WIDTH = /[​-‍⁠﻿]/g

// -> The TeX source of a KaTeX formula. The sanitizer drops <annotation> but keeps its text,
//    as a text node right under <math>.
function texOf (katexEl) {
  const math = katexEl.querySelector('.katex-mathml math')
  if (!math) { return '' }
  const annotation = math.querySelector('annotation')
  if (annotation) { return annotation.textContent.trim() }
  return Array.from(math.childNodes)
    .filter(n => n.nodeType === 3)
    .map(n => n.textContent)
    .join('')
    .trim()
}

// -> The heading as plain text, each formula as its TeX source: "Tổng $\sum a_i$"
function plainTitle (heading) {
  const copy = heading.cloneNode(true)
  copy.querySelectorAll('.toc-anchor').forEach(el => el.remove())
  copy.querySelectorAll('.katex').forEach(el => {
    const tex = texOf(el)
    const visible = el.querySelector('.katex-html')
    el.replaceWith(tex ? `$${tex}$` : (visible ? visible.textContent : ''))
  })
  copy.querySelectorAll('mjx-container').forEach(el => {
    const mml = el.querySelector('mjx-assistive-mml')
    el.replaceWith(mml ? mml.textContent : '')
  })
  return copy.textContent.replace(ZERO_WIDTH, '').replace(/\s+/g, ' ').trim()
}

/**
 * Markup and plain title of a heading that holds math; null for a heading without math.
 * @param {Element} heading
 * @returns {{ html: string, title: string } | null}
 */
export function headingMath (heading) {
  if (!heading || !heading.querySelector(MATH)) { return null }
  const copy = heading.cloneNode(true)
  copy.querySelectorAll('.toc-anchor').forEach(el => el.remove())
  // -> The TOC entry is a link: a link inside it is invalid and steals the click
  copy.querySelectorAll('a').forEach(a => a.replaceWith(...a.childNodes))
  // -> No second element with the same id (\label writes one). SVG ids stay: MathJax glyphs use them.
  copy.querySelectorAll('[id]').forEach(el => {
    if (!(el instanceof SVGElement)) { el.removeAttribute('id') }
  })
  // -> fit-wide.js marks wide formulas in the article; the TOC has its own width
  copy.querySelectorAll('.katex.is-wide').forEach(el => el.classList.remove('is-wide'))
  return { html: copy.innerHTML.trim(), title: plainTitle(heading) }
}
