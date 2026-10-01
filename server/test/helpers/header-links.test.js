const { normalizeLinks, MAX_LINKS } = require('../../helpers/header-links')

describe('helpers/header-links/normalizeLinks', () => {
  it('returns an empty list for anything that is not an array', () => {
    expect(normalizeLinks(null)).toEqual([])
    expect(normalizeLinks({ name: 'A', url: '/a' })).toEqual([])
  })

  it('sorts by order and keeps input order on ties', () => {
    const result = normalizeLinks([
      { name: 'C', url: '/c', order: 3 },
      { name: 'A', url: '/a', order: 1 },
      { name: 'B1', url: '/b1', order: 2 },
      { name: 'B2', url: '/b2', order: 2 }
    ])
    expect(result.map(l => l.name)).toEqual(['A', 'B1', 'B2', 'C'])
  })

  it('trims fields and coerces order to an integer', () => {
    expect(normalizeLinks([{ name: '  Home ', url: ' https://vnoi.info ', order: '4.7' }]))
      .toEqual([{ name: 'Home', url: 'https://vnoi.info', order: 4 }])
  })

  it('drops links without a name or with an unsafe URL', () => {
    const result = normalizeLinks([
      { name: '', url: '/a', order: 1 },
      { name: 'Script', url: 'javascript:alert(1)', order: 1 },
      { name: 'Proto', url: '//evil.example', order: 1 },
      { name: 'Data', url: 'data:text/html,hi', order: 1 },
      { name: 'Space', url: '/a b', order: 1 },
      { name: 'Ok', url: 'HTTPS://vnoi.info/path?q=1', order: 1 },
      { name: 'Path', url: '/', order: 1 }
    ])
    expect(result.map(l => l.name)).toEqual(['Ok', 'Path'])
  })

  it('caps the list length', () => {
    const links = Array.from({ length: MAX_LINKS + 5 }, (v, i) => ({ name: `L${i}`, url: '/x', order: i }))
    expect(normalizeLinks(links)).toHaveLength(MAX_LINKS)
  })
})
