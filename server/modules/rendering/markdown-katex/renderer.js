const katex = require('katex')
const chemParse = require('./mhchem')
const latexMatcher = require('../../../helpers/latex-matcher')

/* global WIKI */

// ------------------------------------
// Markdown - KaTeX Renderer
// ------------------------------------
//
// Includes code from https://github.com/liradb2000/markdown-it-katex

// Add \ce, \pu, and \tripledash to the KaTeX macros.
katex.__defineMacro('\\ce', function(context) {
  return chemParse(context.consumeArgs(1)[0], 'ce')
})
katex.__defineMacro('\\pu', function(context) {
  return chemParse(context.consumeArgs(1)[0], 'pu')
})

//  Needed for \bond for the ~ forms
//  Raise by 2.56mu, not 2mu. We're raising a hyphen-minus, U+002D, not
//  a mathematical minus, U+2212. So we need that extra 0.56.
katex.__defineMacro('\\tripledash', '{\\vphantom{-}\\raisebox{2.56mu}{$\\mkern2mu' + '\\tiny\\text{-}\\mkern1mu\\text{-}\\mkern1mu\\text{-}\\mkern2mu$}}')

// Add \eqref, \ref, and \label to the KaTeX macros.
katex.__defineMacro('\\eqref', '\\href{##ktx-#1}{(\\text{#1})}')

katex.__defineMacro('\\ref', '\\href{##ktx-#1}{\\text{#1}}')

katex.__defineMacro('\\label', '\\htmlId{ktx-#1}{}')

module.exports = {
  init (mdinst, conf) {
    const macros = {}
    if (conf.useInline) {
      mdinst.inline.ruler.after('escape', 'katex_inline', (...args) => latexMatcher.latexInline('katex_inline', ...args))
      mdinst.renderer.rules.katex_inline = (tokens, idx) => {
        try {
          return katex.renderToString(tokens[idx].content, {
            displayMode: false,
            macros,
            trust: (context) => ['\\htmlId', '\\href'].includes(context.command)
          })
        } catch (err) {
          WIKI.logger.warn(err)
          return tokens[idx].content
        }
      }
    }
    if (conf.useBlocks) {
      mdinst.block.ruler.after('blockquote', 'katex_block', (...args) => latexMatcher.latexBlock('katex_block', ...args), {
        alt: [ 'paragraph', 'reference', 'blockquote', 'list' ]
      })
      mdinst.renderer.rules.katex_block = (tokens, idx) => {
        try {
          return `<p>` + katex.renderToString(tokens[idx].content, {
            displayMode: true,
            macros,
            trust: (context) => ['\\htmlId', '\\href'].includes(context.command)
          }) + `</p>`
        } catch (err) {
          WIKI.logger.warn(err)
          return tokens[idx].content
        }
      }
    }
  }
}
