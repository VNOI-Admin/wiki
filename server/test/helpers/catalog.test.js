const { articleContext, cleanText, homeSummary, normalizeHref, parseCatalog, searchIndex } = require('../../helpers/catalog')

const PAGE = `# Danh sách bài viết

| Độ khó | Mô tả |
|--------|-------|
| ⭐ | Cơ bản |
| ⭐⭐ | Kiến thức cần biết |

## Thuật toán

## Nhập môn

- [Tầm quan trọng của Thuật Toán - ⭐](/translate/topcoder/The-Importance-of-Algorithm)
- [Độ phức tạp thời gian - ⭐](/algo/basic/computational-complexity.md)

## Cấu trúc dữ liệu
- [Persistent Data Structures - <big>:new:</big> - ⭐⭐⭐](/algo/data-structures/persistent-data-structures-2)
<!--- [Hidden - ⭐⭐](/hidden)-->
### Cấu trúc dữ liệu dạng cây
- [Range Tree - ⭐⭐⭐](https://drive.google.com/file/d/x/view?usp=sharing)

## Toán học
### Số học
- **Số học cơ bản:**
  - [$a^{b} \\bmod c$ -  Lũy thừa nhị phân - ⭐](/algo/algebra/binary_exponentation.md)

# Chia sẻ kinh nghiệm

## Kĩ năng thi cử

- [Viết trình chấm](/algo/skill/viet-trinh-cham)
`

describe('helpers/catalog', () => {
  const catalog = parseCatalog(PAGE)

  it('reads the difficulty legend', () => {
    expect(catalog.legend).toEqual(['Cơ bản', 'Kiến thức cần biết', '', '', ''])
  })

  it('turns an empty h2 and a later h1 into part labels', () => {
    expect(catalog.topics).toEqual([
      { name: 'Nhập môn', part: 'Thuật toán' },
      { name: 'Cấu trúc dữ liệu', part: 'Thuật toán' },
      { name: 'Toán học', part: 'Thuật toán' },
      { name: 'Kĩ năng thi cử', part: 'Chia sẻ kinh nghiệm' }
    ])
  })

  it('reads items with difficulty, topic, sub-group and new mark', () => {
    expect(catalog.items.map(i => [i.title, i.stars, i.topic, i.sub, i.isNew])).toEqual([
      ['Tầm quan trọng của Thuật Toán', 1, 0, '', false],
      ['Độ phức tạp thời gian', 1, 0, '', false],
      ['Persistent Data Structures', 3, 1, '', true],
      ['Range Tree', 3, 1, 'Cấu trúc dữ liệu dạng cây', false],
      ['a^b mod c - Lũy thừa nhị phân', 1, 2, 'Số học cơ bản', false],
      ['Viết trình chấm', 0, 3, '', false]
    ])
  })

  it('skips commented-out items', () => {
    expect(catalog.items.find(i => i.href === '/hidden')).toBeUndefined()
  })

  it('strips .md from site paths only', () => {
    expect(normalizeHref('/algo/basic/x.md')).toEqual('/algo/basic/x')
    expect(normalizeHref('/algo/basic/x.md#a')).toEqual('/algo/basic/x#a')
    expect(normalizeHref('https://example.com/readme.md')).toEqual('https://example.com/readme.md')
  })

  it('drops links that are not a site path or http(s)', () => {
    expect(normalizeHref('javascript:alert(1)')).toEqual('')
    expect(normalizeHref('//evil.example/x')).toEqual('')
    expect(normalizeHref('data:text/html,x')).toEqual('')
    expect(normalizeHref('relative/path')).toEqual('')
    const bad = parseCatalog('# T\n## A\n- [Bad - ⭐](javascript:alert(1))\n- [Good - ⭐](/good)\n')
    expect(bad.items.map(i => i.href)).toEqual(['/good'])
  })

  it('cleans titles', () => {
    expect(cleanText('Chia căn - <big>:new:</big> - Phần I - ⭐⭐')).toEqual('Chia căn - Phần I')
    expect(cleanText('Sắp xếp Tô-pô - ⭐⭐')).toEqual('Sắp xếp Tô-pô')
    expect(cleanText('"Nhảy nhị phân" với bộ nhớ $\\mathcal{O}(n)$ - ⭐⭐⭐')).toEqual('"Nhảy nhị phân" với bộ nhớ O(n)')
  })

  it('survives empty input', () => {
    expect(parseCatalog('')).toEqual({ legend: ['', '', '', '', ''], topics: [], items: [] })
  })

  it('summarizes topics and the newest pages for Home', () => {
    const items = catalog.items.map((it, i) => ({ ...it, pageId: i + 1, createdAt: i === 5 ? null : `2024-01-0${i + 1}T00:00:00Z` }))
    // -> The same page twice counts once
    items[4] = { ...items[4], pageId: 4 }
    const home = homeSummary({ ...catalog, items }, 2)
    expect(home.topics).toEqual([
      { name: 'Nhập môn', count: 2, spread: [2, 0, 0, 0, 0] },
      { name: 'Cấu trúc dữ liệu', count: 2, spread: [0, 0, 2, 0, 0] },
      { name: 'Toán học', count: 1, spread: [1, 0, 0, 0, 0] }
    ])
    expect(home.newest.map(n => n.title)).toEqual(['a^b mod c - Lũy thừa nhị phân', 'Persistent Data Structures'])
    // -> A page listed twice keeps its first topic
    expect(home.topicOf[4]).toEqual('Cấu trúc dữ liệu')
  })

  it('places an article in its topic, with every topic for the rail', () => {
    // -> The external link (Range Tree) has no page
    const items = catalog.items.map((it, i) => ({ ...it, pageId: it.href.startsWith('/') ? i + 1 : null }))
    const ctx = articleContext({ ...catalog, items }, 3)
    expect(ctx.group).toEqual({ name: 'Cấu trúc dữ liệu', filter: 't:Cấu trúc dữ liệu' })
    // -> Outside the first part, the group is the part
    expect(articleContext({ ...catalog, items }, 6).group).toEqual({ name: 'Chia sẻ kinh nghiệm', filter: 'p:Chia sẻ kinh nghiệm' })
    expect(ctx.stars).toEqual(3)
    expect(ctx.topics.map(t => [t.name, t.items.map(it => it.pageId)])).toEqual([
      ['Nhập môn', [1, 2]],
      ['Cấu trúc dữ liệu', [3]],
      ['Toán học', [5]],
      ['Kĩ năng thi cử', [6]]
    ])
    expect(ctx.topics[2].items[0].path).toEqual('algo/algebra/binary_exponentation')
    expect(articleContext({ ...catalog, items }, 99)).toBeNull()
    expect(articleContext({ ...catalog, items }, 3, false).topics).toEqual([])
  })

  it('builds the search index from the catalogue and the roadmaps', () => {
    const roadmaps = [{
      id: 'general',
      title: 'Lộ trình tổng quát',
      sections: [
        { title: 'Nhập môn', nodes: [{ id: 'n1', title: 'Độ phức tạp', articlePath: 'vi/algo/basic/computational-complexity' }] },
        { title: 'Đồ thị', nodes: [{ id: 'n2', title: 'Luồng', articlePath: '' }, { id: 'n3', title: 'Bài tập', externalUrl: 'https://oj.vnoi.info' }] }
      ]
    }]
    const index = searchIndex(catalog, roadmaps)
    expect(index.articles).toHaveLength(6)
    expect(index.articles[2]).toEqual({ title: 'Persistent Data Structures', href: '/algo/data-structures/persistent-data-structures-2', pageId: null, stars: 3, topic: 'Cấu trúc dữ liệu' })
    expect(index.roadmapItems.map(it => [it.nodeId, it.title, it.href, it.stage])).toEqual([
      ['n1', 'Độ phức tạp', '/vi/algo/basic/computational-complexity', 1],
      ['n2', 'Luồng', null, 2],
      ['n3', 'Bài tập', 'https://oj.vnoi.info', 2]
    ])
    expect(searchIndex(null, []).articles).toEqual([])
  })
})
