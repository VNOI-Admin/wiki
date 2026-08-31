/**
 * The progress feature's locale keys live in server/locales/{lang}.yml, which Wiki.js
 * only loads when NODE_ENV=development (server/core/localization.js). In production the
 * keys are absent, and i18next renders a missing key as the raw key path — so every
 * $t() call for a progress key must supply a default, or production shows
 * "progress.manageData" to readers.
 *
 * These tests guard that, and check the yml files stay in sync with the code.
 */
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import i18next from 'i18next'

const SOURCES = [
  'client/components/common/page-progress-selector.vue',
  'client/components/common/progress-data-dialog.vue',
  'client/components/admin/admin-progress.vue',
  'client/components/admin.vue',
  'client/themes/default/components/page.vue'
]

const read = f => fs.readFileSync(path.resolve(f), 'utf8')
const loadYml = lang => yaml.safeLoad(read(`server/locales/${lang}.yml`))

/** Flatten a nested locale tree into `ns:a.b.c` keys. */
function flatten (tree) {
  const out = []
  const walk = (node, prefix) => {
    for (const [k, v] of Object.entries(node)) {
      if (v && typeof v === 'object') { walk(v, prefix ? `${prefix}.${k}` : k) } else { out.push(`${prefix}.${k}`) }
    }
  }
  for (const [ns, node] of Object.entries(tree)) walk(node, ns === 'common' || ns === 'admin' ? '' : ns)
  return out
}

/**
 * Every $t() call in the sources that targets a progress key, with the full argument
 * text — matched by scanning to the closing paren, so multi-line
 * `$t(key, { defaultValue: ... })` calls are captured whole.
 */
function progressCalls () {
  const calls = []
  for (const file of SOURCES) {
    const src = read(file)
    for (const m of src.matchAll(/\$t\(\s*['"`]((?:common|admin):progress\.[a-zA-Z.]+)['"`]/g)) {
      let depth = 1
      let i = m.index + m[0].length
      while (i < src.length && depth > 0) {
        if (src[i] === '(') { depth++ } else if (src[i] === ')') { depth-- }
        i++
      }
      calls.push({ file, key: m[1], rest: src.slice(m.index + m[0].length, i - 1) })
    }
  }
  return calls
}

describe('progress i18n', () => {
  it('finds the $t calls it is meant to check', () => {
    expect(progressCalls().length).toBeGreaterThan(20)
  })

  it('gives every progress $t call a default, so production never shows a raw key', () => {
    const offenders = progressCalls()
      .filter(c => !/^\s*,\s*['"`]/.test(c.rest) && !/^\s*,\s*\{[\s\S]*\bdefaultValue\s*:/.test(c.rest))
      .map(c => `${c.file}: ${c.key}`)
    expect(offenders).toEqual([])
  })

  it('defines every referenced key in both en.yml and vi.yml', () => {
    const en = flatten(loadYml('en'))
    const vi = flatten(loadYml('vi'))
    const referenced = [...new Set(progressCalls().map(c => c.key.split(':')[1]))]
    expect(referenced.filter(k => !en.includes(k))).toEqual([])
    expect(referenced.filter(k => !vi.includes(k))).toEqual([])
  })

  it('keeps en.yml and vi.yml at full key parity', () => {
    expect(flatten(loadYml('vi')).sort()).toEqual(flatten(loadYml('en')).sort())
  })

  it('resolves to the translation in dev and to English in production', async () => {
    const viStrings = loadYml('vi')

    // -> Production: the dev yml never loads, so only official keys are present
    const prod = i18next.createInstance()
    await prod.init({ lng: 'vi', fallbackLng: 'vi', defaultNS: 'common', resources: { vi: { common: {}, admin: {} } } })
    expect(prod.t('common:progress.manageData', 'Manage data')).toEqual('Manage data')
    expect(prod.t('common:progress.dialog.imported', {
      defaultValue: 'Imported progress data ({{count}} pages).', count: 4
    })).toEqual('Imported progress data (4 pages).')

    // -> Dev: the yml is loaded and the Vietnamese wins over the default
    const dev = i18next.createInstance()
    await dev.init({ lng: 'vi', fallbackLng: 'vi', defaultNS: 'common', resources: { vi: viStrings } })
    expect(dev.t('common:progress.manageData', 'Manage data')).toEqual('Quản lý dữ liệu')
    expect(dev.t('common:progress.dialog.imported', {
      defaultValue: 'Imported progress data ({{count}} pages).', count: 4
    })).toEqual('Đã nhập dữ liệu tiến độ (4 trang).')
  })

  it('interpolates every placeholder the Vietnamese strings declare', () => {
    const en = loadYml('en'); const vi = loadYml('vi')
    const vars = s => [...String(s).matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort()
    const walk = (a, b, p = '') => {
      for (const [k, v] of Object.entries(a)) {
        if (v && typeof v === 'object') { walk(v, b[k], `${p}${k}.`) } else if (p.includes('progress.')) {
          expect({ key: p + k, vars: vars(b[k]) }).toEqual({ key: p + k, vars: vars(v) })
        }
      }
    }
    walk(en, vi)
  })
})
