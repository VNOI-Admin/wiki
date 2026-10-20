const { pickTerm, stripMarkdown, makeSnippet, SIZE } = require('../../helpers/search-snippet')

describe('helpers/search-snippet', () => {
  it('picks the longest word of the query', () => {
    expect(pickTerm('  cây  segment tree ')).toBe('segment')
    expect(pickTerm('')).toBe('')
  })

  it('keeps the text of markdown and HTML', () => {
    const md = '## Bài toán\n- **Cho** một [đồ thị](/algo/graph) có `n` đỉnh <br> và *m* cạnh\n| a | b |\n|---|---|'
    expect(stripMarkdown(md)).toBe('Bài toán Cho một đồ thị có n đỉnh và m cạnh a b')
  })

  it('removes footnote marks', () => {
    expect(stripMarkdown('Segment tree [^[1]^](/algo/st) và BIT[^2].')).toBe('Segment tree và BIT.')
  })

  it('keeps TeX as written', () => {
    expect(stripMarkdown('Độ phức tạp $O(n \\log n)$.')).toBe('Độ phức tạp $O(n \\log n)$.')
    expect(stripMarkdown('Với _mỗi_ $a_i$ và __mọi__ $b_{j}$')).toBe('Với mỗi $a_i$ và mọi $b_{j}$')
  })

  it('marks the cut edges and drops partial words', () => {
    const raw = 'ngữ cảnh trước ' + 'từ '.repeat(100)
    const out = makeSnippet(raw.slice(0, SIZE), 40)
    expect(out.startsWith('… cảnh trước')).toBe(true)
    expect(out.endsWith(' …')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(186)
  })

  it('returns the whole text when the page is short', () => {
    expect(makeSnippet('# Tiêu đề\nNội dung ngắn.', 1)).toBe('Tiêu đề Nội dung ngắn.')
    expect(makeSnippet(null, 1)).toBe('')
  })
})
