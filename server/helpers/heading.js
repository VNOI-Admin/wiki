/**
 * Heading text and markup for anchors and the table of contents.
 * KaTeX writes each formula three times (MathML, TeX source, HTML); only the HTML is visible.
 */

// -> The visible text of a heading: no MathML copy, no anchor
function headingText ($, el) {
  const copy = $(el).clone()
  copy.find('.katex-mathml, .toc-anchor').remove()
  return copy.text().replace(/\s+/g, ' ').trim()
}

// -> The heading markup for the table of contents, only when it holds math; null otherwise
//    (KaTeX or MathJax). Ids go, so the TOC repeats none of the page; SVG ids stay for MathJax glyphs.
function headingHtml ($, el) {
  if ($(el).find('.katex, mjx-container').length < 1) { return null }
  const copy = $(el).clone()
  copy.find('.toc-anchor').remove()
  copy.find('a').each((i, a) => { $(a).replaceWith($(a).contents()) })
  copy.find('[id]').each((i, n) => {
    if ($(n).closest('svg').length < 1) { $(n).removeAttr('id') }
  })
  return copy.html().trim()
}

module.exports = { headingText, headingHtml }
