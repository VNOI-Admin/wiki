const cheerio = require('cheerio')
const katex = require('katex')
const { headingText, headingHtml } = require('../../helpers/heading')

const load = html => cheerio.load(html)

describe('helpers/heading', () => {
  it('reads the visible text of a heading with math, without the anchor', () => {
    const $ = load(`<h4><a class="toc-anchor" href="#x">¶</a> Tính ${katex.renderToString('g(S)')}</h4>`)
    const el = $('h4').get(0)

    expect(headingText($, el)).toEqual('Tính g(S)')

    const html = headingHtml($, el)
    expect(html).toContain('class="katex"')
    expect(html).not.toContain('toc-anchor')
    expect(html.match(/katex-html/g)).toHaveLength(1)
  })

  it('does not repeat the TeX source of a formula', () => {
    const $ = load(`<h2>Họ hàm ${katex.renderToString('\\mathcal{O}(n)')}</h2>`)
    const text = headingText($, $('h2').get(0))

    expect(text).not.toContain('mathcal')
    expect(text.slice('Họ hàm '.length).length).toBeLessThanOrEqual(5)
  })

  it('leaves a heading without math as text only', () => {
    const $ = load('<h2>Plain <a href="/x">link</a></h2>')
    const el = $('h2').get(0)

    expect(headingText($, el)).toEqual('Plain link')
    expect(headingHtml($, el)).toBeNull()
  })

  it('drops links from the TOC markup but keeps their text', () => {
    const $ = load(`<h3>${katex.renderToString('x')} in <a href="/y">here</a></h3>`)
    const html = headingHtml($, $('h3').get(0))

    // -> `<a` alone would match `<annotation>` in the MathML copy: test for the tag itself
    expect(html).not.toMatch(/<a[\s>]/)
    expect(html).toContain('here')
  })
})
