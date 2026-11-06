<template lang="pug">
  .vn-wrap.vn-home
    //- HERO: search on the left, the roadmap card on the right
    section.vn-hero(:class='{ "is-single": !roadmap }')
      div
        h1(lang='en') From VNOI #[em with luv]
          svg.vn-hero__heart(viewBox='0 0 24 24', aria-hidden='true')
            path(d='M12 21s-7.5-4.6-9.6-9.3C1 8.5 2.9 4.5 6.8 4.5c2.2 0 3.7 1.2 5.2 3 1.5-1.8 3-3 5.2-3 3.9 0 5.8 4 4.4 7.2C19.5 16.4 12 21 12 21z')
        button.vn-bigsearch(type='button', @click='openSearch()')
          v-icon mdi-magnify
          span {{ $t('common:header.searchPlaceholder', 'Tìm bài: DFS, quy hoạch động, segment tree…') }}
          kbd /
        .vn-popular
          button.vn-chip(v-for='p of popular', :key='p', type='button', @click='openSearch(p)') {{ p }}
        .vn-reading(v-if='reading.length > 0')
          span.vn-label {{ $t('common:home.reading', 'Đang đọc') }}
          .vn-reading__list
            a(v-for='r of reading', :key='r.pageId', :href='r.href')
              span.vn-pdot.s-reading
              span.vn-reading__t {{ r.title || r.path }}
              span.vn-reading__s(v-if='home.topicOf') {{ home.topicOf[r.pageId] }}

      aside.vn-cont(v-if='roadmap')
        h2 {{ roadmap.title }}
        .vn-cont__bar(aria-hidden='true')
          i(:style='{ width: stats.percent + `%` }')
        .vn-cont__n(v-if='stats.completed > 0') {{ doneLabel }}
        a.vn-cont__next(v-if='nextItem', :href='nextItem.href', @click='onOpen')
          span.vn-label {{ stats.completed > 0 ? $t('common:roadmap.continue', 'Học tiếp') : $t('common:roadmap.start', 'Bắt đầu') }}
          b {{ nextItem.node.title }}
        .vn-cont__peek
          div(v-for='st of peek', :key='st.section.id')
            span {{ st.si + 1 }}. {{ st.section.title }}
            span {{ st.stats.total ? st.stats.completed + '/' + st.stats.total : '–' }}
        a.vn-btn(:href='`/roadmap/` + roadmap.id') {{ $t('common:home.viewRoadmap', 'Xem lộ trình') }}

    //- ABOUT
    section.vn-hsec
      .vn-hsec__head
        h2 {{ $t('common:home.aboutTitle', 'Giới thiệu VNOI Wiki') }}
      p.vn-about__p {{ $t('common:home.about1', 'Thư viện VNOI Wiki là thư viện tài liệu Lập trình thi đấu Tiếng Việt lớn nhất với gần 200 bài viết học thuật do đội ngũ admin, tình nguyện viên VNOI cùng các tác giả khác biên soạn và đóng góp. Bên cạnh đó, VNOI Wiki cũng thường xuyên đóng góp và đăng tải các nội dung liên quan như Tạp chí VNOI (các mục Bài viết học thuật và Kĩ thuật thú vị), phỏng vấn các nhân vật nổi tiếng trong lĩnh vực Công nghệ thông tin và Lập trình thi đấu, các bài viết thuộc các chủ đề Khoa học máy tính khác.') }}
      .vn-statblock
        .vn-statblock__cap {{ $t('common:home.statsTitle', 'Những con số ấn tượng') }}
        .vn-stats
          .vn-stat(v-for='s of stats3', :key='s.key')
            span.vn-stat__n {{ s.value }}
            span.vn-stat__l {{ s.label }}
      p.vn-about__p {{ $t('common:home.about2', 'Trong suốt quá trình xây dựng và phát triển thư viện tài liệu, VNOI Wiki vẫn luôn đồng hành cùng nhiều thế hệ học sinh và giáo viên Tin học trên khắp đất nước trên con đường chinh phục Lập trình thi đấu và các kì thi như Học sinh giỏi Quốc gia/Quốc tế, ICPC, Olympic Sinh viên,... góp phần xây dựng một cộng đồng Tin học lớn mạnh tại Việt Nam.') }}

    //- FEATURES
    section.vn-hsec
      .vn-hsec__head
        h2 {{ $t('common:home.featuresTitle', 'Các tính năng nổi bật') }}
      .vn-feats
        .vn-feat(v-for='(f, fi) of features', :key='f.key')
          .vn-feat__top
            span.vn-feat__icon
              v-icon {{ f.icon }}
            span.vn-feat__k {{ String(fi + 1).padStart(2, '0') }}
          h3.vn-feat__t {{ f.title }}
          p.vn-feat__d {{ f.desc }}

    //- TOPICS
    section.vn-hsec(v-if='home.topics.length > 0')
      .vn-hsec__head
        h2 {{ $t('common:home.topics', 'Chủ đề thuật toán') }}
        a(:href='catalogHref') {{ $t('common:home.allArticles', 'Tất cả bài viết') }} →
      .vn-topics
        a.vn-topic(v-for='(t, ti) of home.topics', :key='ti', :href='catalogHref + `?topic=` + encodeURIComponent(`t:` + t.name)')
          span.vn-topic__t {{ t.name }}
          span.vn-topic__c {{ countLabel(t.count) }}
          span.vn-topic__spread(role='img', :aria-label='spreadLabel(t.spread)')
            i(v-for='(v, k) of t.spread', :key='k', :style='{ height: barHeight(t, v) }')
          span.vn-topic__x(aria-hidden='true')
            span(v-for='k in 5', :key='k') {{ k }}★

    //- HELP
    section.vn-hsec
      .vn-help
        v-icon.vn-help__icon mdi-forum-outline
        p
          | {{ $t('common:home.helpLead', 'Bạn đọc bài viết nhưng không hiểu? Hãy hỏi ở') }}
          |
          a(href='https://www.facebook.com/groups/163215593699283/', target='_blank', rel='noopener') {{ $t('common:home.helpFacebook', 'Group Facebook') }}
          |
          | {{ $t('common:home.helpOr', 'hoặc') }}
          |
          a(href='https://discord.gg/m5rVAz7DXx', target='_blank', rel='noopener') Discord From VNOI with love
          | .
</template>

<script>
import _ from 'lodash'
import { recordHref } from '../../../modules/progress/page-path'
import { CLOSED_STATUSES, READING_STATUS, getNodeStatus, nodeHref, nodeStats, pickRoadmap, touchRoadmap } from '../../../modules/roadmap-context'
import { POPULAR_TERMS } from '../../../modules/search-rank'

// -> Estimated from the credits in the article sources (November 2026)
const AUTHOR_ESTIMATE = '60+'
// -> Cards that enter one after another, and the last step of that delay
const REVEAL_CARDS = '.vn-stat, .vn-feat, .vn-topic'
const REVEAL_MAX_STEP = 8

export default {
  props: {
    home: {
      type: Object,
      required: true
    }
  },
  data () {
    return { popular: POPULAR_TERMS }
  },
  computed: {
    catalogHref () {
      return `/${this.$store.get('page/locale')}/articles`
    },
    roadmap () {
      return pickRoadmap(this.home.roadmaps)
    },
    stats3 () {
      return [
        { key: 'articles', value: '~200', label: this.$t('common:home.statArticles', 'bài viết học thuật') },
        { key: 'authors', value: AUTHOR_ESTIMATE, label: this.$t('common:home.statAuthors', 'tác giả biên soạn') },
        // -> The catalogue's algorithm topics; a guess when the catalogue is empty
        { key: 'topics', value: this.home.topics.length || '10', label: this.$t('common:home.statTopics', 'chủ đề thuật toán lớn') }
      ]
    },
    features () {
      return [
        {
          key: 'fresh',
          icon: 'mdi-lightbulb-on-outline',
          title: this.$t('common:home.feat1Title', 'Cập nhật kiến thức mới và chất lượng nhất'),
          desc: this.$t('common:home.feat1Desc', 'Bài viết do đội ngũ VNOI biên soạn, review kĩ và cập nhật thường xuyên.')
        },
        {
          key: 'problems',
          icon: 'mdi-format-list-checks',
          title: this.$t('common:home.feat2Title', 'Danh sách bài tập đính kèm từng bài viết'),
          desc: this.$t('common:home.feat2Desc', 'Luyện tập ngay sau khi đọc lý thuyết với các bài tập chọn lọc.')
        },
        {
          key: 'roadmap',
          icon: 'mdi-map-marker-path',
          title: this.$t('common:home.feat3Title', 'Tích hợp VNOI Roadmap vào VNOI Wiki'),
          desc: this.$t('common:home.feat3Desc', 'Học theo lộ trình từ cơ bản đến nâng cao, mở ngay bên cạnh bài viết.')
        },
        {
          key: 'progress',
          icon: 'mdi-account-check-outline',
          title: this.$t('common:home.feat4Title', 'Đọc bài viết và theo dõi tiến độ với tài khoản VNOJ'),
          desc: this.$t('common:home.feat4Desc', 'Đánh dấu bài đang đọc, đã hoàn thành và đồng bộ giữa các thiết bị.')
        }
      ]
    },
    // -> Read in each status computation, so a status change re-renders the card
    records () {
      return this.$progress.state.records
    },
    reading () {
      this.records // eslint-disable-line no-unused-expressions
      if (!this.$progress.isEnabled) { return [] }
      return this.$progress.listRecords()
        .filter(r => r.statusId === READING_STATUS && r.pageId)
        .map(r => ({ ...r, href: recordHref(r) }))
        .filter(r => r.href)
    },
    items () {
      if (!this.roadmap) { return [] }
      return _.flatMap(this.roadmap.sections, (section, si) => section.nodes.map(node => ({ node, section, si })))
    },
    stats () {
      this.records // eslint-disable-line no-unused-expressions
      return nodeStats(this.$progress, this.roadmap.id, _.map(this.items, 'node'))
    },
    nextItem () {
      this.records // eslint-disable-line no-unused-expressions
      const it = _.find(this.items, i => nodeHref(i.node) && !CLOSED_STATUSES.includes(getNodeStatus(this.$progress, this.roadmap.id, i.node).id))
      return it ? { ...it, href: nodeHref(it.node) } : null
    },
    // -> The stage of the next article and the two after it
    peek () {
      if (!this.roadmap) { return [] }
      const sections = this.roadmap.sections
      const from = Math.max(0, Math.min(this.nextItem ? this.nextItem.si : 0, sections.length - 3))
      return sections.slice(from, from + 3).map((section, k) => ({
        section,
        si: from + k,
        stats: nodeStats(this.$progress, this.roadmap.id, section.nodes)
      }))
    },
    doneLabel () {
      return this.$t('common:roadmap.completed', { defaultValue: 'Đã hoàn thành {{completed}} / {{total}}', completed: this.stats.completed, total: this.stats.total })
    }
  },
  methods: {
    openSearch (term) {
      if (term) { this.$store.set('site/search', term) }
      this.$store.set('site/searchIsFocused', true)
    },
    onOpen () {
      touchRoadmap(this.roadmap.id)
    },
    countLabel (count) {
      return this.$t('common:roadmap.articleCount', { defaultValue: '{{count}} bài', count })
    },
    spreadLabel (spread) {
      const list = spread.map((n, k) => `${k + 1}★: ${n}`).join(', ')
      return this.$t('common:home.spread', { defaultValue: 'Số bài theo độ khó: {{list}}', list })
    },
    barHeight (topic, value) {
      const max = Math.max(1, ...topic.spread)
      return Math.round(value / max * 100) + '%'
    },
    // -> Each block of a section below the hero (heading, paragraph, card grid) fades in as
    //    it scrolls into view; blocks already in view fade in on load. Cards of a grid follow
    //    one after another. Without JS, with reduced motion or in print, all shows at once.
    setupReveal () {
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced || !('IntersectionObserver' in window)) { return }
      const blocks = Array.from(this.$el.querySelectorAll('.vn-hsec > *'))
      blocks.forEach(b => {
        b.classList.add('vn-reveal')
        b.querySelectorAll(REVEAL_CARDS).forEach((el, i) => {
          el.classList.add('vn-reveal__card')
          el.style.setProperty('--i', Math.min(i, REVEAL_MAX_STEP))
        })
      })
      this.revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) { return }
          e.target.classList.add('is-in')
          this.revealObserver.unobserve(e.target)
        })
      }, { rootMargin: '0px 0px -8% 0px' })
      blocks.forEach(b => this.revealObserver.observe(b))
    }
  },
  mounted () {
    this.setupReveal()
  },
  beforeDestroy () {
    if (this.revealObserver) { this.revealObserver.disconnect() }
  }
}
</script>

<style lang="scss">
.vn-home {
  color: var(--ink);
}

.vn-home .vn-label {
  font: 600 0.75rem var(--font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

// ---------------------------------
// HERO
// ---------------------------------

.vn-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 32px;
  padding-block: 56px 40px;

  &.is-single {
    grid-template-columns: minmax(0, 1fr);
  }

  h1 {
    margin: 0;
    font-size: clamp(2rem, 4.6vw, 3.2rem);
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.12;

    em {
      font-style: normal;
      color: var(--accent);
    }
  }
}

.vn-hero__heart {
  width: 0.72em;
  height: 0.72em;
  margin-left: 0.18em;
  vertical-align: -0.04em;
  fill: var(--mark-red);
}

.vn-home .vn-bigsearch {
  width: 100%;
  max-width: 36rem;
  margin-top: 26px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 16px;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
  color: var(--muted);
  font-size: 1rem;

  &:hover {
    border-color: var(--accent);
  }

  .v-icon {
    color: var(--accent) !important;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  kbd {
    margin-left: auto;
    padding: 1px 6px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--sunken);
    box-shadow: none;
    color: var(--muted);
    font: 500 0.75rem var(--font-mono);
  }
}

.vn-popular {
  max-width: 36rem;
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  .vn-chip {
    padding: 4px 11px;
  }
}

.vn-reading {
  max-width: 36rem;
  margin-top: 28px;
  display: grid;
  gap: 8px;
}

.vn-reading__list {
  // -> Three rows show; more rows scroll
  max-height: calc(3 * 2.9rem + 2px);
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);

  a {
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 11px 16px;
    color: var(--ink) !important;
    font-size: 0.9375rem;
    text-decoration: none !important;

    & + a {
      border-top: 1px solid var(--line);
    }

    &:hover {
      background: var(--sunken);
    }
  }
}

.vn-reading__t {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vn-reading__s {
  font-size: 0.8125rem;
  color: var(--muted);
  white-space: nowrap;

  @media (max-width: 640px) {
    display: none;
  }
}

// -> The card fills the hero height, so its edges line up with the left column
.vn-cont {
  // -> A column: the button sits at the bottom, whichever rows show
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow);

  h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
  }

  > .vn-btn {
    margin-top: auto;
    align-self: flex-start;
  }
}

.vn-cont__bar {
  height: 8px;
  border-radius: 4px;
  background: var(--sunken);
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--accent);
    transition: width 0.4s ease;
  }
}

.vn-cont__n {
  font-size: 0.875rem;
  color: var(--muted);
}

.vn-cont__next {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--sunken);
  color: var(--ink) !important;
  text-decoration: none !important;

  &:hover {
    box-shadow: inset 0 0 0 1px var(--accent);
  }

  b {
    font-weight: 600;
  }
}

.vn-cont__peek {
  display: grid;
  gap: 6px;
  font-size: 0.875rem;

  div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  span:last-child {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
}

// ---------------------------------
// SECTIONS
// ---------------------------------

.vn-hsec {
  display: grid;
  gap: 18px;
  padding-block: 28px;
}

// -> Scroll reveal. Only `backwards` fill: once done, the cards' own hover transforms apply again.
@keyframes vn-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

.vn-reveal:not(.is-in),
.vn-reveal:not(.is-in) .vn-reveal__card {
  opacity: 0;
}

.vn-reveal.is-in {
  animation: vn-rise 0.5s ease backwards;

  .vn-reveal__card {
    animation: vn-rise 0.45s ease backwards;
    animation-delay: calc(0.1s + var(--i, 0) * 60ms);
  }
}

@media print {
  .vn-reveal,
  .vn-reveal .vn-reveal__card {
    opacity: 1 !important;
    animation: none !important;
  }
}

.vn-hsec__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 1.375rem;
    font-weight: 700;
  }

  a {
    color: var(--accent) !important;
  }
}

// -> About: two paragraphs around the numbers
.vn-about__p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
  text-align: justify;
  color: var(--ink);
}

.vn-statblock {
  display: grid;
  gap: 14px;
  padding-block: 12px;
}

.vn-home .vn-statblock__cap {
  text-align: center;
  font: 600 0.75rem var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.vn-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

// -> A gradient ring and a soft glow of the accent color
.vn-stat {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 26px 20px;
  border: 1px solid transparent;
  border-radius: 16px;
  text-align: center;
  background:
    radial-gradient(120% 90% at 50% 0%, var(--accent-soft), var(--surface) 70%) padding-box,
    linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 25%, var(--line)) 55%, #8b5cf6) border-box;
  box-shadow: 0 10px 32px -12px color-mix(in srgb, var(--accent) 55%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 40px -12px color-mix(in srgb, var(--accent) 70%, transparent);
  }
}

.vn-stat__n {
  font-size: clamp(2.2rem, 4.2vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 10px color-mix(in srgb, var(--accent) 35%, transparent));
}

.vn-stat__l {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--muted);
}

// -> Features: white cards on a tinted panel, so the section stands out
.vn-feats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: var(--accent-soft);
}

.vn-feat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.vn-feat__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.vn-feat__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--accent);

  .v-icon {
    color: var(--on-accent) !important;
    font-size: 24px;
  }
}

.vn-feat__k {
  font: 600 0.8125rem var(--font-mono);
  color: var(--muted);
}

.vn-home .vn-feat__t {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--ink);
}

.vn-feat__d {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--muted);
}

// -> Help: where to ask, at the end of the page
.vn-help {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-left: 4px solid var(--accent);
  border-radius: 12px;
  background: var(--surface);

  p {
    margin: 0;
    font-size: 1rem;
    line-height: 1.6;
  }

  a {
    color: var(--accent) !important;
    font-weight: 600;
  }
}

.vn-home .vn-help__icon {
  flex: none;
  color: var(--accent) !important;
}

.vn-topics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14.5rem, 1fr));
  gap: 12px;
}

.vn-topic {
  display: grid;
  // -> A long title takes the free space, so the charts of one row line up
  grid-template-rows: 1fr auto auto auto;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink) !important;
  text-decoration: none !important;

  &:hover {
    border-color: var(--accent);
  }
}

.vn-topic__t {
  font-size: 1rem;
  font-weight: 600;
}

.vn-topic__c {
  font: 500 0.8125rem var(--font-mono);
  color: var(--muted);
}

.vn-topic__spread,
.vn-topic__x {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 3px;
}

.vn-topic__spread {
  align-items: end;
  height: 26px;

  i {
    display: block;
    min-height: 2px;
    border-radius: 2px 2px 0 0;
    background: var(--accent);
    opacity: 0.85;
  }
}

.vn-topic__x {
  margin-top: -6px;
  text-align: center;
  font: 500 0.75rem var(--font-mono);
  color: var(--muted);
}

@media (max-width: 900px) {
  .vn-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
    padding-block: 36px 28px;
  }

  .vn-feats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .vn-stats,
  .vn-feats {
    grid-template-columns: minmax(0, 1fr);
  }

  .vn-stat {
    padding: 14px 16px;
  }

  .vn-popular {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
  }

  .vn-topics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .vn-topic {
    padding: 12px;
  }
}
</style>
