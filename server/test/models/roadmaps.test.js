const NodeCache = require('node-cache')
const Roadmap = require('../../models/roadmaps')

/* global WIKI */

function queryStub (rows) {
  const q = {
    where: () => q,
    orderBy: () => q,
    select: () => q,
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject)
  }
  return q
}

const node = (id, articlePath) => ({ id, title: id, description: 'long text', difficulty: 1, articlePath, externalUrl: '' })

describe('models/roadmaps/getForPage', () => {
  let roadmapQueries

  beforeEach(() => {
    roadmapQueries = 0
    global.WIKI = {
      cache: new NodeCache(),
      models: {
        roadmaps: {
          query: () => {
            roadmapQueries++
            return queryStub([
              { id: 'bronze', title: 'Bronze', sections: [{ id: 's1', title: 'Intro', nodes: [node('a', 'en/a'), node('b', 'en/b')] }] },
              { id: 'silver', title: 'Silver', sections: [{ id: 's2', title: 'More', nodes: [node('b2', 'en/b'), node('c', 'en/c')] }] }
            ])
          }
        },
        pages: {
          query: () => queryStub([
            { id: 1, localeCode: 'en', path: 'a', title: 'Page A' },
            { id: 2, localeCode: 'en', path: 'b', title: 'Page B' }
          ])
        }
      }
    }
  })

  afterEach(() => { delete global.WIKI })

  it('returns only the roadmaps containing the page', async () => {
    expect((await Roadmap.getForPage('en', 'a')).map(r => r.id)).toEqual(['bronze'])
    expect((await Roadmap.getForPage('en', 'b')).map(r => r.id)).toEqual(['bronze', 'silver'])
    expect(await Roadmap.getForPage('en', 'zzz')).toEqual([])
  })

  it('resolves page ids and drops fields the sidebar does not use', async () => {
    const [bronze] = await Roadmap.getForPage('en', 'a')
    expect(bronze.sections[0].nodes[0]).toEqual({ id: 'a', title: 'a', articlePath: 'en/a', externalUrl: '', pageId: 1, pageTitle: 'Page A' })
  })

  it('serves page views from the cache until it is cleared', async () => {
    await Roadmap.getForPage('en', 'a')
    await Roadmap.getForPage('en', 'b')
    expect(roadmapQueries).toEqual(1)
    Roadmap.clearCache()
    await Roadmap.getForPage('en', 'a')
    expect(roadmapQueries).toEqual(2)
    expect(WIKI.cache.keys()).toHaveLength(1)
  })
})
