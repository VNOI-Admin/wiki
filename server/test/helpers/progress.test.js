const { normalizeStatuses, defaultStatuses } = require('../../helpers/progress')

describe('helpers/progress/normalizeStatuses', () => {
  it('falls back to the seed statuses when given nothing usable', () => {
    expect(normalizeStatuses([]).map(s => s.id)).toEqual(defaultStatuses.map(s => s.id))
    expect(normalizeStatuses(null).map(s => s.id)).toEqual(defaultStatuses.map(s => s.id))
    expect(normalizeStatuses([{ id: '!!' }]).map(s => s.id)).toEqual(defaultStatuses.map(s => s.id))
  })

  it('drops duplicate and malformed ids', () => {
    const result = normalizeStatuses([
      { id: 'Reading', label: 'Reading' },
      { id: 'reading', label: 'Duplicate' },
      { id: 'not a slug', label: 'Bad' },
      { id: 'done', label: 'Done' }
    ])
    expect(result.map(s => s.id)).toEqual(['reading', 'done'])
  })

  it('rejects icons that are not MDI names', () => {
    const [status] = normalizeStatuses([{ id: 'a', label: 'A', icon: '"><script>alert(1)</script>' }])
    expect(status.icon).toEqual('mdi-circle-outline')
  })

  it('forces exactly one default when several are flagged', () => {
    const result = normalizeStatuses([
      { id: 'a', label: 'A', isDefault: true },
      { id: 'b', label: 'B', isDefault: true }
    ])
    expect(result.filter(s => s.isDefault).map(s => s.id)).toEqual(['a'])
  })

  it('promotes the first status when none is flagged default', () => {
    const result = normalizeStatuses([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' }
    ])
    expect(result.filter(s => s.isDefault).map(s => s.id)).toEqual(['a'])
  })

  it('never marks links for the default status', () => {
    const result = normalizeStatuses([{ id: 'a', label: 'A', isDefault: true, showMarker: true }])
    expect(result[0].showMarker).toBe(false)
  })
})

describe('helpers/progress/normalizeRecords', () => {
  const { normalizeRecords, MAX_RECORDS } = require('../../helpers/progress')

  it('drops malformed records', () => {
    const result = normalizeRecords([
      { pageId: 1, statusId: 'reading', updatedAt: 5 },
      { pageId: 0, statusId: 'reading' },
      { pageId: 'x', statusId: 'reading' },
      { pageId: 2.5, statusId: 'reading' },
      { pageId: 3, statusId: 'not a slug' },
      null,
      'junk'
    ])
    expect(result.map(r => r.pageId)).toEqual([1])
  })

  it('returns an empty list for non-arrays', () => {
    expect(normalizeRecords(null)).toEqual([])
    expect(normalizeRecords({ pageId: 1 })).toEqual([])
  })

  it('caps the list, keeping the newest', () => {
    const raw = []
    for (let i = 1; i <= MAX_RECORDS + 5; i++) {
      raw.push({ pageId: i, statusId: 'reading', updatedAt: i })
    }
    const result = normalizeRecords(raw)
    expect(result.length).toEqual(MAX_RECORDS)
    expect(result.some(r => r.pageId === 1)).toBe(false)
  })
})

describe('helpers/progress/mergeRecords', () => {
  const { mergeRecords } = require('../../helpers/progress')

  it('keeps the newer record per page and the union of pages', () => {
    const result = mergeRecords(
      [{ pageId: 1, statusId: 'reading', updatedAt: 10 }, { pageId: 2, statusId: 'reading', updatedAt: 10 }],
      [{ pageId: 1, statusId: 'completed', updatedAt: 20 }, { pageId: 2, statusId: 'skipped', updatedAt: 5 }, { pageId: 3, statusId: 'reading', updatedAt: 1 }]
    )
    const byId = Object.fromEntries(result.map(r => [r.pageId, r.statusId]))
    expect(byId).toEqual({ 1: 'completed', 2: 'reading', 3: 'reading' })
  })
})
