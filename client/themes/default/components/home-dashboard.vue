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

    //- NEWEST ARTICLES
    section.vn-hsec(v-if='home.newest.length > 0')
      .vn-hsec__head
        h2 {{ $t('common:home.newest', 'Bài mới') }}
      .vn-hlist
        a.vn-hrow(v-for='a of home.newest', :key='a.pageId', :href='a.href')
          span.vn-hrow__t {{ a.title }}
          span.vn-hrow__d {{ a.createdAt | moment('L') }}
          span.vn-hrow__s
            span {{ a.topic }}
            vn-stars(v-if='a.stars', :value='a.stars')

    //- TOPICS
    section.vn-hsec(v-if='home.topics.length > 0')
      .vn-hsec__head
        h2 {{ $t('common:home.topics', 'Chủ đề thuật toán') }}
        a(href='/articles') {{ $t('common:home.allArticles', 'Tất cả bài viết') }} →
      .vn-topics
        a.vn-topic(v-for='(t, ti) of home.topics', :key='ti', :href='`/articles?topic=` + encodeURIComponent(`t:` + t.name)')
          span.vn-topic__t {{ t.name }}
          span.vn-topic__c {{ countLabel(t.count) }}
          span.vn-topic__spread(role='img', :aria-label='spreadLabel(t.spread)')
            i(v-for='(v, k) of t.spread', :key='k', :style='{ height: barHeight(t, v) }')
          span.vn-topic__x(aria-hidden='true')
            span(v-for='k in 5', :key='k') {{ k }}★
</template>

<script>
import _ from 'lodash'
import VnStars from '../../../components/common/vn-stars.vue'
import { DONE_STATUS, READING_STATUS, getNodeStatus, nodeHref, nodeStats, pickRoadmap, touchRoadmap } from '../../../modules/roadmap-context'

// -> Search shortcuts for common topics
const POPULAR = ['Quy hoạch động', 'DFS', 'Segment Tree', 'Fenwick', 'Dijkstra']
// -> Statuses that end the reading: the next article skips them
const CLOSED_STATUSES = [DONE_STATUS, 'skipped']

export default {
  components: { VnStars },
  props: {
    home: {
      type: Object,
      required: true
    }
  },
  data () {
    return { popular: POPULAR }
  },
  computed: {
    roadmap () {
      return pickRoadmap(this.home.roadmaps)
    },
    // -> Read in each status computation, so a status change re-renders the card
    records () {
      return this.$progress.state.records
    },
    reading () {
      this.records // eslint-disable-line no-unused-expressions
      if (!this.$progress.isEnabled) { return [] }
      // -> Records come from browser storage or an imported file: build only site paths
      return this.$progress.listRecords()
        .filter(r => r.statusId === READING_STATUS && r.pageId && r.locale && r.path)
        .map(r => ({ ...r, href: encodeURI(`/${r.locale}/${r.path}`.replace(/\/{2,}/g, '/')) }))
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
      return this.$t('common:roadmap.completed', { defaultValue: '{{completed}} / {{total}}', completed: this.stats.completed, total: this.stats.total })
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
    }
  }
}
</script>

<style lang="scss">
.vn-home {
  color: var(--ink);

  button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    cursor: pointer;
    text-align: inherit;
  }

  .vn-chip {
    border: 1px solid var(--line);
    background: var(--surface);
  }
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
  fill: #c1272d;
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
    grid-template-columns: 12px minmax(0, 1fr);
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

// -> The card fills the hero height, so its edges line up with the left column
.vn-cont {
  display: grid;
  grid-template-rows: repeat(5, auto) 1fr;
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
    align-self: end;
    justify-self: start;
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

.vn-hlist {
  display: grid;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  overflow: hidden;
}

.vn-hrow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px 14px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  color: var(--ink) !important;
  text-decoration: none !important;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: var(--sunken);
  }
}

// -> Two rows per line on wide screens, one on phones
@media (min-width: 761px) {
  .vn-hlist {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .vn-hrow:nth-child(odd) {
    border-right: 1px solid var(--line);
  }
  .vn-hrow:nth-last-child(-n+2):nth-child(odd) {
    border-bottom: 0;
  }
}

.vn-hrow__t {
  min-width: 0;
  font-weight: 500;
}

.vn-hrow__d {
  font: 500 0.8125rem var(--font-mono);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--muted);
}

.vn-hrow__s {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 0.8125rem;
  color: var(--muted);
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
}

@media (max-width: 640px) {
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
