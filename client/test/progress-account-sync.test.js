/**
 * @jest-environment jsdom
 */
import ProgressStorage, { STORAGE_KEY } from '../modules/progress/progress-storage'
import ProgressManager from '../modules/progress/progress-manager'
import StatusRegistry from '../modules/progress/status-registry'
import AccountSync, { mergeRecords } from '../modules/progress/account-sync'

global.siteConfig = { lang: 'en' }

const statuses = [
  { id: 'none', label: 'Not Started', icon: 'mdi-circle-outline', color: 'grey', isDefault: true, showMarker: false },
  { id: 'reading', label: 'Reading', icon: 'mdi-progress-clock', color: 'blue', isDefault: false, showMarker: true },
  { id: 'completed', label: 'Completed', icon: 'mdi-check-circle', color: 'green', isDefault: false, showMarker: true }
]

const USER_ID = 5
const USER_KEY = `${STORAGE_KEY}:user:${USER_ID}`

function makeManager (key = USER_KEY) {
  const registry = StatusRegistry.fromConfig({ statuses })
  return new ProgressManager(new ProgressStorage({ key, debounceMs: 0 }), registry)
}

/**
 * A fake Apollo client backed by an in-memory "server" record list.
 */
function makeServer (initial = []) {
  const server = {
    records: initial,
    calls: [],
    fail: false,
    query: jest.fn(async () => {
      server.calls.push({ op: 'mine' })
      if (server.fail) { throw new Error('offline') }
      return { data: { progress: { mine: JSON.stringify(server.records) } } }
    }),
    mutate: jest.fn(async ({ variables }) => {
      const incoming = JSON.parse(variables.records)
      server.calls.push({ op: 'save', merge: variables.merge, records: incoming })
      if (server.fail) { throw new Error('offline') }
      server.records = variables.merge ? mergeRecords(server.records, incoming) : incoming
      return { data: { progress: { save: { responseResult: { succeeded: true }, records: JSON.stringify(server.records) } } } }
    })
  }
  return server
}

function makeSync (manager, server) {
  return new AccountSync({ manager, userId: USER_ID, getClient: () => server, debounceMs: 0 })
}

const flush = () => new Promise(resolve => setTimeout(resolve, 5))

beforeEach(() => {
  window.localStorage.clear()
})

describe('progress-manager/adopt', () => {
  it('replaces the records and rebuilds aliases with reason account', () => {
    const manager = makeManager()
    const events = []
    manager.on(evt => events.push(evt))
    manager.adopt([{ pageId: 7, statusId: 'completed', locale: 'en', path: 'algo/bfs', updatedAt: 1 }])
    expect(manager.getStatusByHref('/en/algo/bfs').id).toEqual('completed')
    expect(events[events.length - 1].reason).toEqual('account')
  })
})

describe('account-sync', () => {
  it('loads the account records on start', async () => {
    const server = makeServer([{ pageId: 1, statusId: 'reading', locale: 'en', path: 'a', updatedAt: 1 }])
    const manager = makeManager()
    await makeSync(manager, server).start()
    expect(manager.getRecord(1).statusId).toEqual('reading')
    expect(server.calls.map(c => c.op)).toEqual(['mine'])
  })

  it('merges guest progress once, newer wins', async () => {
    const guest = makeManager(STORAGE_KEY)
    guest.setStatus(1, 'completed', { locale: 'en', path: 'a' })
    guest.setStatus(2, 'reading', { locale: 'en', path: 'b' })
    guest.storage.flush()

    const server = makeServer([
      { pageId: 1, statusId: 'reading', locale: 'en', path: 'a', updatedAt: 1 },
      { pageId: 3, statusId: 'reading', locale: 'en', path: 'c', updatedAt: 1 }
    ])
    const manager = makeManager()
    await makeSync(manager, server).start()
    expect(manager.getRecord(1).statusId).toEqual('completed')
    expect(manager.count).toEqual(3)
    expect(server.calls.filter(c => c.op === 'save' && c.merge).length).toEqual(1)

    // -> A second page load does not merge again
    server.calls = []
    await makeSync(makeManager(), server).start()
    expect(server.calls.map(c => c.op)).toEqual(['mine'])
  })

  it('pushes local changes but not adopted ones', async () => {
    const server = makeServer([])
    const manager = makeManager()
    await makeSync(manager, server).start()
    expect(server.calls.map(c => c.op)).toEqual(['mine'])

    manager.setStatus(9, 'reading', { locale: 'en', path: 'x' })
    await flush()
    expect(server.records.map(r => r.pageId)).toEqual([9])
    expect(server.calls[server.calls.length - 1]).toMatchObject({ op: 'save', merge: false })

    manager.setStatus(9, 'none')
    await flush()
    expect(server.records).toEqual([])
  })

  it('merges unsynced changes on the next start', async () => {
    const server = makeServer([])
    const manager = makeManager()
    await makeSync(manager, server).start()

    server.fail = true
    manager.setStatus(4, 'completed', { locale: 'en', path: 'd' })
    manager.storage.flush()
    await flush()
    expect(server.records).toEqual([])

    server.fail = false
    const next = makeManager()
    await makeSync(next, server).start()
    expect(server.records.map(r => r.pageId)).toEqual([4])
    expect(next.getRecord(4).statusId).toEqual('completed')
  })

  it('does not push before a successful start', async () => {
    const server = makeServer([])
    server.fail = true
    const manager = makeManager()
    const sync = makeSync(manager, server)
    await sync.start()
    expect(sync.status.state).toEqual('error')

    manager.setStatus(4, 'completed', { locale: 'en', path: 'd' })
    await flush()
    expect(server.calls.every(c => c.op === 'mine')).toBe(true)
  })
})

describe('progress-manager/roadmap nodes', () => {
  const NODE = '3f2b6c1e-8a4d-4f5e-9b7a-1c2d3e4f5a6b'

  it('tracks external roadmap nodes separately from pages', () => {
    const manager = makeManager()
    expect(manager.getStatusByNode('dp', NODE).id).toEqual('none')
    manager.setNodeStatus('dp', NODE, 'completed', { title: 'CF blog', url: 'https://codeforces.com/blog/1' })
    expect(manager.getStatusByNode('dp', NODE).id).toEqual('completed')
    expect(manager.getStatusByNode('other', NODE).id).toEqual('none')
    expect(manager.state.aliases).toEqual({})

    manager.setNodeStatus('dp', NODE, 'none')
    expect(manager.count).toEqual(0)
  })

  it('round-trips node records through adopt and merge', () => {
    const manager = makeManager()
    const node = { roadmapId: 'dp', nodeId: NODE, statusId: 'reading', url: 'https://x.y', updatedAt: 5 }
    const page = { pageId: 1, statusId: 'reading', locale: 'en', path: 'a', updatedAt: 5 }
    manager.adopt([node, page])
    expect(manager.count).toEqual(2)

    const merged = mergeRecords([node, page], [{ ...node, statusId: 'completed', updatedAt: 9 }])
    expect(merged.length).toEqual(2)
    expect(merged.find(r => r.nodeId).statusId).toEqual('completed')
  })
})
