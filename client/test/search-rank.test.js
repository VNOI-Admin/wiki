import { expandQuery, foldText, normText, rankArticles, rankRoadmapItems } from '../modules/search-rank'

const ARTICLES = [
  { title: 'Cây chỉ số nhị phân (Fenwick Tree)', href: '/algo/data-structures/fenwick', topic: 'Cấu trúc dữ liệu' },
  { title: 'Quy hoạch động cơ bản', href: '/algo/basic/dynamic-programming', topic: 'Quy hoạch động' },
  { title: 'Cây phân đoạn (cơ bản)', href: '/algo/data-structures/segment-tree-basic', topic: 'Cấu trúc dữ liệu' },
  { title: 'Phép toán bit', href: '/algo/basic/bitwise', topic: 'Các kỹ thuật cơ bản' },
  { title: 'Duyệt đồ thị', href: '/algo/graph-theory/dfs-bfs', topic: 'Lý thuyết đồ thị' }
]

describe('search-rank', () => {
  it('folds Vietnamese marks and keeps one character per character', () => {
    expect(foldText('Đồ thị')).toEqual('do thi')
    expect(foldText('Đồ thị')).toHaveLength('Đồ thị'.length)
    expect(normText('  Cây (phân) đoạn!! ')).toEqual('cay phan doan')
  })

  it('expands a query with its synonyms', () => {
    expect(expandQuery('dp').map(o => o.q)).toEqual(['dp', 'qhd', 'quy hoach dong'])
    expect(expandQuery('zzz')).toHaveLength(1)
  })

  it('ranks a title match first, without a synonym label', () => {
    const hits = rankArticles(ARTICLES, 'quy hoạch động')
    expect(hits[0].article.title).toEqual('Quy hoạch động cơ bản')
    expect(hits[0].syn).toBeNull()
  })

  it('finds an article by a synonym, and names the synonym', () => {
    const hits = rankArticles(ARTICLES, 'dp')
    expect(hits[0].article.title).toEqual('Quy hoạch động cơ bản')
    expect(hits[0].syn).toEqual('quy hoach dong')
    expect(rankArticles(ARTICLES, 'BIT')[0].article.title).toEqual('Phép toán bit')
    expect(rankArticles(ARTICLES, 'BIT').map(h => h.article.href)).toContain('/algo/data-structures/fenwick')
  })

  it('matches a short synonym only as a whole word', () => {
    // -> "segment tree" brings "it"; "bit" must not match it
    const hits = rankArticles(ARTICLES, 'segment tree')
    expect(hits.map(h => h.article.title)).not.toContain('Phép toán bit')
  })

  it('returns nothing for an empty query or no match', () => {
    expect(rankArticles(ARTICLES, '  ')).toEqual([])
    expect(rankArticles(ARTICLES, 'xyzzy')).toEqual([])
  })

  it('ranks roadmap items by title', () => {
    const items = [
      { title: 'Luồng cực đại', stageTitle: 'Luồng' },
      { title: 'Sắp xếp', stageTitle: 'Nhập môn' }
    ]
    expect(rankRoadmapItems(items, 'flow').map(i => i.title)).toEqual(['Luồng cực đại'])
    expect(rankRoadmapItems(items, 'sap xep').map(i => i.title)).toEqual(['Sắp xếp'])
  })
})
