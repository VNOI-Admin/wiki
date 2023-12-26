const mjax = require('mathjax')
const latexMatcher = require('../../../helpers/latex-matcher')

/* global WIKI */

// ------------------------------------
// Markdown - MathJax Renderer
// ------------------------------------

const extensions = [
  'bbox',
  'boldsymbol',
  'braket',
  'color',
  'extpfeil',
  'mhchem',
  'newcommand',
  'unicode',
  'verb'
]

module.exports = {
  async init (mdinst, conf) {
    const MathJax = await mjax.init({
      loader: {
        require: require,
        paths: { mathjax: 'mathjax/es5' },
        load: [
          'input/tex',
          'output/svg',
          ...extensions.map(e => `[tex]/${e}`)
        ]
      },
      tex: {
        packages: {'[+]': extensions},
        macros: {
          '*': '{*}'
        }
      }
    })
    if (conf.useInline) {
      mdinst.inline.ruler.after('escape', 'mathjax_inline', (...args) => latexMatcher.latexInline('mathjax_inline', ...args))
      mdinst.renderer.rules.mathjax_inline = (tokens, idx) => {
        try {
          const result = MathJax.tex2svg(tokens[idx].content, {
            display: false
          })
          return MathJax.startup.adaptor.innerHTML(result)
        } catch (err) {
          WIKI.logger.warn(err)
          return tokens[idx].content
        }
      }
    }
    if (conf.useBlocks) {
      mdinst.block.ruler.after('blockquote', 'mathjax_block', (...args) => latexMatcher.latexBlock('mathjax_block', ...args), {
        alt: [ 'paragraph', 'reference', 'blockquote', 'list' ]
      })
      mdinst.renderer.rules.mathjax_block = (tokens, idx) => {
        try {
          const result = MathJax.tex2svg(tokens[idx].content, {
            display: true
          })
          return `<p>` + MathJax.startup.adaptor.innerHTML(result) + `</p>`
        } catch (err) {
          WIKI.logger.warn(err)
          return tokens[idx].content
        }
      }
    }
  }
}
