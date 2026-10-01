import { pickRoadmap, touchRoadmap } from '../modules/roadmap-context'

describe('roadmap-context', () => {
  beforeEach(() => { window.localStorage.clear() })

  it('shows nothing for a page outside every roadmap', () => {
    expect(pickRoadmap([])).toBeNull()
  })

  it('shows the only roadmap, whatever was used last', () => {
    touchRoadmap('silver')
    expect(pickRoadmap([{ id: 'bronze' }]).id).toEqual('bronze')
  })

  it('shows the most recently used roadmap among several', () => {
    const now = jest.spyOn(Date, 'now')
    now.mockReturnValue(1000)
    touchRoadmap('silver')
    now.mockReturnValue(2000)
    touchRoadmap('bronze')
    now.mockRestore()
    expect(pickRoadmap([{ id: 'silver' }, { id: 'bronze' }]).id).toEqual('bronze')
    expect(pickRoadmap([{ id: 'silver' }, { id: 'gold' }]).id).toEqual('silver')
  })

  it('falls back to the first roadmap when none was used', () => {
    expect(pickRoadmap([{ id: 'silver' }, { id: 'bronze' }]).id).toEqual('silver')
  })

  it('survives corrupt storage', () => {
    window.localStorage.setItem('wiki-roadmap:lastUsed', '{not json')
    expect(pickRoadmap([{ id: 'a' }, { id: 'b' }]).id).toEqual('a')
    touchRoadmap('b')
    expect(pickRoadmap([{ id: 'a' }, { id: 'b' }]).id).toEqual('b')
  })
})
