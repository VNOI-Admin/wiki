import Prism from 'prismjs'

// -> A code block longer than this folds to its first lines; a button shows the rest
const FOLD_LINES = 30

const t = (key, fallback, opts) => window.WIKI ? window.WIKI.$t(`common:page.${key}`, { defaultValue: fallback, ...opts }) : fallback

function label (open, lines) {
  return open ? t('codeLess', 'Thu gọn') : t('codeMore', 'Hiện toàn bộ {{lines}} dòng', { lines })
}

/**
 * Fold long code blocks. It runs after Prism's toolbar plugin, which wraps the block in
 * `.code-toolbar`; the language autoloader can highlight a block twice, so a block folds once.
 */
export function registerCodeFold () {
  Prism.hooks.add('complete', env => {
    const pre = env.element && env.element.parentElement
    const box = pre && pre.parentElement
    if (!box || !box.classList.contains('code-toolbar') || box.dataset.fold) { return }
    const lines = String(env.code || '').replace(/\n$/, '').split('\n').length
    box.dataset.fold = lines > FOLD_LINES ? 'long' : 'short'
    if (lines <= FOLD_LINES) { return }

    box.classList.add('is-long')
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'vn-codefold'
    btn.setAttribute('aria-expanded', 'false')
    btn.textContent = label(false, lines)
    btn.addEventListener('click', () => {
      const open = box.classList.toggle('is-open')
      btn.setAttribute('aria-expanded', String(open))
      btn.textContent = label(open, lines)
      // -> After a fold, the button can be far below: bring the block back into view
      if (!open) { box.scrollIntoView({ block: 'nearest' }) }
    })
    box.appendChild(btn)
  })
}
