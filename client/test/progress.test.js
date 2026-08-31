/**
 * @jest-environment jsdom
 */
import ProgressStorage, { STORAGE_KEY } from '../modules/progress/progress-storage'
import ProgressManager from '../modules/progress/progress-manager'
import StatusRegistry from '../modules/progress/status-registry'
import { decorateLinks } from '../modules/progress/link-decorator'
import { buildExport, parseImport, ImportError } from '../modules/progress/import-export'
import { parsePagePath, makeAliasKey } from '../modules/progress/page-path'

global.siteConfig = { lang: 'en' }

const statuses = [
  { id: 'none', label: 'Not Started', icon: 'mdi-circle-outline', color: 'grey', isDefault: true, showMarker: false },
  { id: 'reading', label: 'Reading', icon: 'mdi-progress-clock', color: 'blue', isDefault: false, showMarker: true },
  { id: 'completed', label: 'Completed', icon: 'mdi-check-circle', color: 'green', isDefault: false, showMarker: true }
]

function makeManager () {
  const registry = StatusRegistry.fromConfig({ statuses })
  return new ProgressManager(new ProgressStorage({ debounceMs: 0 }), registry)
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('page-path/parsePagePath', () => {
  it('strips the locale segment, hash and query', () => {
    expect(parsePagePath('/en/algo/dp#section')).toEqual({ locale: 'en', path: 'algo/dp' })
    expect(parsePagePath('/en/algo/dp?x=1')).toEqual({ locale: 'en', path: 'algo/dp' })
  })

  it('falls back to the site locale when namespacing is off', () => {
    expect(parsePagePath('/algo/dp')).toEqual({ locale: 'en', path: 'algo/dp' })
  })

  it('handles regional locales and system prefixes', () => {
    expect(parsePagePath('/pt-BR/algo/dp')).toEqual({ locale: 'pt-BR', path: 'algo/dp' })
    expect(parsePagePath('/e/en/algo/dp')).toEqual({ locale: 'en', path: 'algo/dp' })
  })

  it('treats the root as home and rejects junk', () => {
    expect(parsePagePath('/')).toEqual({ locale: 'en', path: 'home' })
    expect(parsePagePath('')).toBeNull()
  })
})

describe('ProgressManager', () => {
  it('persists a status across a reload', () => {
    const manager = makeManager()
    manager.recordVisit({ pageId: 142, locale: 'en', path: 'algo/dp', title: 'DP' })
    manager.setStatus(142, 'completed', { locale: 'en', path: 'algo/dp', title: 'DP' })
    manager.storage.flush()

    const reloaded = makeManager()
    expect(reloaded.getStatusByPageId(142).id).toEqual('completed')
    expect(reloaded.getStatusByHref('/en/algo/dp').id).toEqual('completed')
  })

  it('deletes the record when set back to the default status', () => {
    const manager = makeManager()
    manager.setStatus(142, 'completed', { locale: 'en', path: 'algo/dp' })
    expect(manager.count).toEqual(1)
    manager.setStatus(142, 'none')
    expect(manager.count).toEqual(0)
    expect(manager.getStatusByPageId(142).id).toEqual('none')
  })

  it('keeps progress through a page move and prunes the stale alias', () => {
    const manager = makeManager()
    manager.setStatus(142, 'reading', { locale: 'en', path: 'algo/dp', title: 'DP' })

    manager.recordVisit({ pageId: 142, locale: 'en', path: 'algo/dynamic-programming', title: 'DP' })

    expect(manager.getStatusByPageId(142).id).toEqual('reading')
    expect(manager.getStatusByHref('/en/algo/dynamic-programming').id).toEqual('reading')
    expect(manager.getStatusByHref('/en/algo/dp')).toBeNull()
    expect(manager.state.aliases[makeAliasKey('en', 'algo/dp')]).toBeUndefined()
  })

  it('preserves records whose status is no longer configured', () => {
    const manager = makeManager()
    manager.setStatus(142, 'reading', { locale: 'en', path: 'algo/dp' })
    manager.storage.flush()

    const shrunk = new ProgressManager(
      new ProgressStorage({ debounceMs: 0 }),
      StatusRegistry.fromConfig({ statuses: [statuses[0], statuses[2]] })
    )
    expect(shrunk.getStatusByPageId(142).isUnknown).toBe(true)
    expect(shrunk.getRecord(142).statusId).toEqual('reading')

    // -> Re-adding the status in admin restores the record
    const restored = makeManager()
    expect(restored.getStatusByPageId(142).id).toEqual('reading')
  })

  it('registers the alias from setStatus alone, with no prior visit', () => {
    const manager = makeManager()
    manager.setStatus(142, 'completed', { locale: 'en', path: 'algo/dp', title: 'DP' })
    expect(manager.getStatusByHref('/en/algo/dp').id).toEqual('completed')
  })

  it('does not write anything when browsing untracked pages', () => {
    const manager = makeManager()
    manager.recordVisit({ pageId: 142, locale: 'en', path: 'algo/dp', title: 'DP' })
    manager.recordVisit({ pageId: 7, locale: 'en', path: 'algo/bfs', title: 'BFS' })

    expect(manager.state.aliases).toEqual({})
    expect(manager.count).toEqual(0)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('drops the alias when a page returns to the default status', () => {
    const manager = makeManager()
    manager.setStatus(142, 'reading', { locale: 'en', path: 'algo/dp' })
    expect(manager.getPageIdByPath('en', 'algo/dp')).toEqual(142)

    manager.setStatus(142, 'none')
    expect(manager.getPageIdByPath('en', 'algo/dp')).toBeNull()
    expect(manager.state.aliases).toEqual({})
  })

  it('keeps the alias index the same size as the record set', () => {
    const manager = makeManager()
    manager.setStatus(1, 'reading', { locale: 'en', path: 'a' })
    manager.setStatus(2, 'completed', { locale: 'en', path: 'b' })
    manager.recordVisit({ pageId: 3, locale: 'en', path: 'c' })

    expect(Object.keys(manager.state.aliases).length).toEqual(manager.count)
  })

  it('rebuilds the alias index on import so unvisited pages resolve', () => {
    const manager = makeManager()
    const payload = buildExport([
      { pageId: 7, statusId: 'completed', locale: 'en', path: 'algo/bfs', title: 'BFS', updatedAt: 1 }
    ])
    manager.replaceAll(parseImport(JSON.stringify(payload)).records)

    expect(manager.getStatusByHref('/en/algo/bfs').id).toEqual('completed')
  })

  it('overwrites rather than merges on import', () => {
    const manager = makeManager()
    manager.setStatus(142, 'reading', { locale: 'en', path: 'algo/dp' })
    manager.replaceAll([{ pageId: 7, statusId: 'completed', locale: 'en', path: 'algo/bfs' }])

    expect(manager.count).toEqual(1)
    expect(manager.getRecord(142)).toBeNull()
  })

  it('adopts state written by another tab', () => {
    const manager = makeManager()
    const other = makeManager()
    other.setStatus(142, 'completed', { locale: 'en', path: 'algo/dp' })
    other.storage.flush()

    manager.storage.onStorageEvent({ key: STORAGE_KEY })
    expect(manager.getStatusByPageId(142).id).toEqual('completed')
  })
})

describe('ProgressStorage', () => {
  it('quarantines a corrupt blob instead of throwing during boot', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    const storage = new ProgressStorage({ debounceMs: 0 })
    expect(storage.load().records).toEqual({})
    expect(window.localStorage.getItem(`${STORAGE_KEY}:corrupt`)).toEqual('{not json')
  })

  it('degrades to memory when a write is rejected', () => {
    const storage = new ProgressStorage({ debounceMs: 0 })
    storage.backend = {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        const err = new Error('QuotaExceededError')
        err.name = 'QuotaExceededError'
        throw err
      }
    }
    const events = []
    storage.on(evt => events.push(evt))

    storage.save({ version: 1, updatedAt: 0, records: {}, aliases: {} })
    storage.flush()

    expect(storage.isPersistent).toBe(false)
    expect(events.map(e => e.reason)).toContain('quota')
  })
})

describe('link-decorator', () => {
  function buildDom () {
    const root = document.createElement('div')
    root.innerHTML = [
      '<a href="/en/algo/dp" class="is-internal-link is-valid-page">DP</a>',
      '<a href="/en/algo/gone" class="is-internal-link is-invalid-page">Missing</a>',
      '<a href="https://example.com" class="is-external-link">Ext</a>',
      '<a href="/en/algo/untracked" class="is-internal-link is-valid-page">Untracked</a>'
    ].join('')
    return root
  }

  it('marks only valid internal links to tracked pages', () => {
    const manager = makeManager()
    manager.recordVisit({ pageId: 142, locale: 'en', path: 'algo/dp' })
    manager.setStatus(142, 'completed', { locale: 'en', path: 'algo/dp' })

    const root = buildDom()
    decorateLinks(root, manager)

    const markers = root.querySelectorAll('.progress-marker')
    expect(markers.length).toEqual(1)
    expect(markers[0].getAttribute('title')).toEqual('Completed')
    expect(markers[0].querySelector('i').className).toEqual('mdi mdi-check-circle green--text')
    expect(root.querySelector('a[href="/en/algo/dp"]').getAttribute('data-progress-decorated')).toEqual('completed')
  })

  it('does not mark pages in the default status', () => {
    const manager = makeManager()
    manager.recordVisit({ pageId: 142, locale: 'en', path: 'algo/dp' })
    manager.setStatus(142, 'none')

    const root = buildDom()
    decorateLinks(root, manager)
    expect(root.querySelectorAll('.progress-marker').length).toEqual(0)
  })

  it('is idempotent across repeated runs', () => {
    const manager = makeManager()
    manager.recordVisit({ pageId: 142, locale: 'en', path: 'algo/dp' })
    manager.setStatus(142, 'reading', { locale: 'en', path: 'algo/dp' })

    const root = buildDom()
    decorateLinks(root, manager)
    decorateLinks(root, manager)
    decorateLinks(root, manager)

    expect(root.querySelectorAll('.progress-marker').length).toEqual(1)
  })

  it('removes markers when disabled', () => {
    const manager = makeManager()
    manager.recordVisit({ pageId: 142, locale: 'en', path: 'algo/dp' })
    manager.setStatus(142, 'reading', { locale: 'en', path: 'algo/dp' })

    const root = buildDom()
    decorateLinks(root, manager)
    decorateLinks(root, manager, { enabled: false })

    expect(root.querySelectorAll('.progress-marker').length).toEqual(0)
  })
})

describe('import-export/parseImport', () => {
  it('rejects files that are not progress exports, with a translatable code', () => {
    const codeOf = input => {
      try { parseImport(input) } catch (err) { return err.code }
      throw new Error('expected parseImport to throw')
    }
    expect(codeOf('{not json')).toEqual(ImportError.codes.NOT_JSON)
    expect(codeOf('null')).toEqual(ImportError.codes.NOT_OBJECT)
    expect(codeOf('{"format":"something-else"}')).toEqual(ImportError.codes.WRONG_FORMAT)
    expect(codeOf(JSON.stringify({ format: 'vnoj-wiki-progress', version: 99 }))).toEqual(ImportError.codes.NEWER_VERSION)
    expect(codeOf(JSON.stringify({ format: 'vnoj-wiki-progress', version: 1 }))).toEqual(ImportError.codes.MISSING_RECORDS)
    expect(codeOf(JSON.stringify({ format: 'vnoj-wiki-progress', version: 1, records: [] }))).toEqual(ImportError.codes.NO_RECORDS)
  })

  it('carries interpolation params for the message', () => {
    try {
      parseImport(JSON.stringify({ format: 'vnoj-wiki-progress', version: 99 }))
    } catch (err) {
      expect(err.params).toEqual({ version: 99 })
    }
  })

  it('never puts user-facing English in the module', () => {
    // -> Messages come from the locale files; the module only carries codes.
    const codeOf = input => {
      try { parseImport(input) } catch (err) { return err.message }
      throw new Error('expected parseImport to throw')
    }
    expect(codeOf('{not json')).toEqual('notJson')
  })

  it('drops records without a usable page id', () => {
    const payload = buildExport([
      { pageId: 7, statusId: 'reading', locale: 'en', path: 'a' },
      { pageId: 0, statusId: 'reading', locale: 'en', path: 'b' },
      { pageId: 9, statusId: '', locale: 'en', path: 'c' }
    ])
    expect(parseImport(JSON.stringify(payload)).records.map(r => r.pageId)).toEqual([7])
  })
})
