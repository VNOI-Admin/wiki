const mdContainer = require('markdown-it-container')

// ------------------------------------
// Markdown - Container
// ------------------------------------

// From same implementation in the `editor-markdown.vue`

function renderContainer (tokens, idx, options, env, self) {
  tokens[idx].attrJoin('role', 'alert')
  tokens[idx].attrJoin('class', 'alert')
  tokens[idx].attrJoin('class', `alert-${tokens[idx].info.trim()}`)
  return self.renderToken(...arguments)
};

module.exports = {
  init (md, conf) {
    md.use(mdContainer, 'success', { render: renderContainer })
    md.use(mdContainer, 'info', { render: renderContainer })
    md.use(mdContainer, 'warning', { render: renderContainer })
    md.use(mdContainer, 'danger', { render: renderContainer })
    md.use(mdContainer, 'spoiler', {
      validate: function (params) {
        return params.trim().match(/^spoiler(\s+.*)?$/)
      },
      render: function (tokens, idx) {
        const m = tokens[idx].info.trim().match(/^spoiler(\s+.*)?$/)

        if (tokens[idx].nesting === 1) {
          // opening tag
          let summary = m[1] && m[1].trim()
          if (summary) {
            // Note: This part is implemented by myself, since codimd doesn't support state, but hackmd does.

            const state = summary.match(/\{state="open"\}/) ? 'open' : ''
            if (state === 'open') {
              summary = summary.replace(/\{state="open"\}/, '')
            }
            return `<details ${state}><summary>${md.renderInline(summary)}</summary>\n`
          } else {
            return '<details>\n'
          }
        } else {
          // closing tag
          return '</details>\n'
        }
      }
    })
  }
}
