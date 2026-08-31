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
