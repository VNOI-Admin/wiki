<template lang="pug">
  .vn-wrap.vn-cat
    header.vn-cat__head
      h1 {{ title }}
      button.vn-cat__clear(v-if='hasFilters', type='button', @click='clearFilters') {{ $t('common:catalog.clear', 'Xóa bộ lọc') }}

    .vn-cat__layout
      //- FILTERS
      aside.vn-facets(:aria-label='$t(`common:catalog.filters`, `Bộ lọc`)')
        label.vn-field
          v-icon(small) mdi-magnify
          input(
            ref='filter'
            v-model='q'
            type='search'
            autocomplete='off'
            :placeholder='$t(`common:catalog.filterPlaceholder`, `Lọc theo tên bài`)'
            :aria-label='$t(`common:catalog.filterPlaceholder`, `Lọc theo tên bài`)'
            )

        .vn-facet
          .vn-facet__head
            h2#vn-f-diff {{ $t('common:catalog.difficulty', 'Độ khó') }}
            //- Hover and focus open the legend, a tap toggles it, Esc closes it
            v-menu(
              v-if='hasLegend'
              v-model='legendOpen'
              open-on-hover
              right
              offset-x
              nudge-right='6'
              :close-delay='150'
              max-width='340'
              content-class='vn-menu'
              )
              template(v-slot:activator='{ on, attrs }')
                button.vn-facet__info(
                  type='button'
                  v-bind='attrs'
                  v-on='on'
                  @focus='legendOpen = true'
                  @blur='legendOpen = false'
                  @pointerdown='onLegendPointer'
                  @click='onLegendClick'
                  :aria-label='$t(`common:catalog.legend`, `Ý nghĩa các mức độ khó`)')
                  v-icon(small) mdi-information-outline
              dl.vn-legend
                div(v-for='row of legendRows', :key='row.level')
                  dt
                    vn-stars(:value='row.level')
                  dd {{ row.desc }}
          .vn-opts.is-multi(role='group', aria-labelledby='vn-f-diff')
            button.vn-opt(
              v-for='n in 5'
              :key='n'
              type='button'
              :aria-pressed='stars.includes(n) ? `true` : `false`'
              :disabled='!levelsOn'
              @click='toggle(stars, n)'
              )
              span.vn-cbox
              span {{ levelName(n) }}
              vn-stars(:value='n')

        .vn-facet(v-if='progressOn')
          h2#vn-f-prog {{ $t('common:progress.title', 'Tiến độ') }}
          .vn-opts.is-multi(role='group', aria-labelledby='vn-f-prog')
            button.vn-opt(
              v-for='s of statuses'
              :key='s.id'
              type='button'
              :aria-pressed='prog.includes(s.id) ? `true` : `false`'
              @click='toggle(prog, s.id)'
              )
              span.vn-cbox
              span {{ s.label }}
              status-mark(:status='s')

        .vn-facet
          h2#vn-f-topic {{ $t('common:catalog.topic', 'Chủ đề') }}
          .vn-opts(role='group', aria-labelledby='vn-f-topic')
            button.vn-opt(type='button', :aria-pressed='!topic ? `true` : `false`', @click='topic = null') {{ $t('common:catalog.all', 'Tất cả') }}
            button.vn-opt(
              v-for='t of mainTopics'
              :key='`t-` + t.name'
              type='button'
              :aria-pressed='topic === `t:` + t.name ? `true` : `false`'
              @click='topic = `t:` + t.name'
              ) {{ t.name }}
            template(v-if='otherParts.length > 0')
              hr
              button.vn-opt(
                v-for='p of otherParts'
                :key='`p-` + p'
                type='button'
                :aria-pressed='topic === `p:` + p ? `true` : `false`'
                @click='topic = `p:` + p'
                ) {{ p }}

      //- RESULTS (a screen reader hears only the count, not every card)
      span.d-sr-only(aria-live='polite') {{ countLabel }}
      .vn-results
        section.vn-group(v-for='g of groups', :key='g.name')
          h2 {{ g.name }} #[span.vn-group__n {{ g.items.length }}]
          .vn-cards
            a.vn-acard(
              v-for='it of g.items'
              :key='it.href'
              :href='it.href'
              :target='it.external ? `_blank` : null'
              :rel='it.external ? `noopener` : null'
              :class='{ "is-skipped": statusOf(it).id === `skipped`, "is-ext": it.external }'
              )
              span.vn-acard__t {{ it.title }}
              span.vn-acard__m
                vn-stars(v-if='it.stars', :value='it.stars')
                span(v-else)
                template(v-if='progressOn && statusOf(it).id !== defaultStatusId')
                  status-mark(:status='statusOf(it)', :title='statusOf(it).label', :aria-label='statusOf(it).label')
        .vn-cat__empty(v-if='groups.length < 1')
          span {{ $t('common:catalog.noMatch', 'Không có bài nào khớp.') }}
          button.vn-chip(v-if='q', type='button', @click='searchWiki') {{ searchWikiLabel }}
</template>

<script>
import _ from 'lodash'
import StatusMark from '../../../components/common/status-mark.vue'
import VnStars from '../../../components/common/vn-stars.vue'
import { levelName } from '../../../modules/levels'

// -> Lowercase, no Vietnamese marks: "Đồ thị" matches "do thi"
function fold (text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
}

export default {
  components: { StatusMark, VnStars },
  props: {
    catalog: {
      type: Object,
      required: true
    },
    title: {
      type: String,
      default: ''
    }
  },
  data () {
    const query = new URLSearchParams(window.location.search)
    const list = key => (query.get(key) || '').split(',').filter(Boolean)
    return {
      q: query.get('q') || '',
      topic: query.get('topic') || null,
      stars: list('d').map(Number).filter(n => n >= 1 && n <= 5),
      prog: list('p'),
      legendOpen: false,
      legendTap: null
    }
  },
  computed: {
    progressOn () {
      return this.$progress.isEnabled
    },
    // -> Read in statusOf(), so a status change re-renders the cards
    records () {
      return this.$progress.state.records
    },
    statuses () {
      return this.$progress.registry.list()
    },
    defaultStatusId () {
      return this.$progress.registry.getDefault().id
    },
    legendRows () {
      return this.catalog.legend.map((desc, i) => ({ level: i + 1, desc })).filter(row => row.desc)
    },
    hasLegend () {
      return this.legendRows.length > 0
    },
    firstPart () {
      return _.get(this.catalog.topics, '[0].part', '')
    },
    mainTopics () {
      return this.catalog.topics.filter(t => t.part === this.firstPart)
    },
    otherParts () {
      return _.uniq(this.catalog.topics.filter(t => t.part !== this.firstPart).map(t => t.part))
    },
    items () {
      return this.catalog.items.map(it => ({
        ...it,
        external: !it.href.startsWith('/'),
        topicName: _.get(this.catalog.topics, [it.topic, 'name'], ''),
        part: _.get(this.catalog.topics, [it.topic, 'part'], ''),
        key: fold(it.title + ' ' + it.href)
      }))
    },
    // -> Levels apply to the selected topic only when its articles have levels
    levelsOn () {
      if (!this.topic) { return true }
      return this.items.some(it => this.inTopic(it) && it.stars > 0)
    },
    countLabel () {
      return this.$t('common:catalog.count', { count: this.filtered.length, defaultValue: '{{count}} bài' })
    },
    filtered () {
      const q = fold(this.q.trim())
      const stars = this.levelsOn ? this.stars : []
      return this.items.filter(it =>
        this.inTopic(it) &&
        (stars.length < 1 || stars.includes(it.stars)) &&
        (!q || it.key.includes(q)) &&
        (this.prog.length < 1 || this.prog.includes(this.statusOf(it).id))
      )
    },
    groups () {
      return this.catalog.topics
        .map((t, i) => ({ name: t.name, items: this.filtered.filter(it => it.topic === i) }))
        .filter(g => g.items.length > 0)
    },
    hasFilters () {
      return !!(this.q || this.topic || this.stars.length || this.prog.length)
    },
    searchWikiLabel () {
      return this.$t('common:catalog.searchWiki', { defaultValue: 'Tìm "{{q}}" trong toàn wiki', q: this.q })
    }
  },
  watch: {
    q: 'syncUrl',
    topic: 'syncUrl',
    stars: 'syncUrl',
    prog: 'syncUrl',
    // -> Esc closes the legend also when the hover opened it and focus is elsewhere
    legendOpen (open) {
      window[open ? 'addEventListener' : 'removeEventListener']('keydown', this.onLegendKey)
    }
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.onLegendKey)
  },
  methods: {
    onLegendPointer (e) {
      this.legendTap = e.pointerType === 'touch' ? !this.legendOpen : null
    },
    onLegendClick () {
      if (this.legendTap !== null) { this.legendOpen = this.legendTap }
    },
    onLegendKey (e) {
      if (e.key === 'Escape') { this.legendOpen = false }
    },
    levelName (n) {
      return levelName(this.$t.bind(this), n)
    },
    inTopic (it) {
      if (!this.topic) { return true }
      return this.topic === `t:${it.topicName}` || this.topic === `p:${it.part}`
    },
    statusOf (it) {
      this.records // eslint-disable-line no-unused-expressions
      if (it.pageId) { return this.$progress.getStatusByPageId(it.pageId) }
      return this.$progress.getStatusByHref(it.href) || this.$progress.registry.getDefault()
    },
    toggle (list, value) {
      const idx = list.indexOf(value)
      if (idx >= 0) { list.splice(idx, 1) } else { list.push(value) }
    },
    clearFilters () {
      this.q = ''
      this.topic = null
      this.stars = []
      this.prog = []
      this.$refs.filter.focus()
    },
    // -> Keep the filters in the address, so Back and shared links keep them
    syncUrl () {
      const query = new URLSearchParams()
      if (this.q) { query.set('q', this.q) }
      if (this.topic) { query.set('topic', this.topic) }
      if (this.stars.length) { query.set('d', this.stars.join(',')) }
      if (this.prog.length) { query.set('p', this.prog.join(',')) }
      const search = query.toString()
      window.history.replaceState(null, '', window.location.pathname + (search ? '?' + search : ''))
    },
    searchWiki () {
      this.$store.set('site/search', this.q)
      this.$store.set('site/searchIsFocused', true)
    }
  }
}
</script>

<style lang="scss">
.vn-cat {
  padding-block: 40px 56px;
  color: var(--ink);
}

.vn-cat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h1 {
    margin: 0;
    font-size: clamp(1.8rem, 3.6vw, 2.4rem);
    font-weight: 800;
    letter-spacing: -0.02em;
  }
}

.vn-cat .vn-cat__clear {
  padding: 6px 10px;
  border-radius: 8px;
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 600;

  &:hover {
    background: var(--sunken);
  }
}

.vn-cat__layout {
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  align-items: start;
  gap: 32px;
  padding-top: 16px;
}

// ---------------------------------
// FILTERS
// ---------------------------------

.vn-facets {
  position: sticky;
  top: calc(var(--topbar-h) + 16px);
  max-height: calc(100vh - var(--topbar-h) - 32px);
  overflow-y: auto;
  scrollbar-width: thin;
  display: grid;
  gap: 16px;
  min-width: 0;
}

.vn-field {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);

  &:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
    border-color: transparent;
  }

  .v-icon {
    color: var(--muted) !important;
  }

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    color: var(--ink);
  }
}

.vn-facet {
  min-width: 0;
  padding-top: 14px;
  border-top: 1px solid var(--line);

  h2 {
    margin: 0 0 8px 10px;
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1;
    color: var(--ink);
  }
}

.vn-facet__head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 8px 10px;

  h2 {
    margin: 0;
  }
}

.vn-cat .vn-facet__info {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 6px;

  .v-icon {
    color: var(--muted) !important;
  }

  &:hover,
  &[aria-expanded="true"] {
    background: var(--sunken);

    .v-icon {
      color: var(--accent) !important;
    }
  }
}

.vn-legend {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 12px 14px;
  font-size: 0.8125rem;
  line-height: 1.4;

  div {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    align-items: baseline;
    gap: 8px;
  }

  dd {
    margin: 0;
    color: var(--ink);
  }
}

.vn-opts {
  display: grid;
  gap: 2px;

  hr {
    margin: 6px 10px;
    border: 0;
    border-top: 1px solid var(--line);
  }
}

.vn-cat .vn-opt {
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.9375rem;
  color: var(--ink);

  &:hover {
    background: var(--sunken);
  }

  &[aria-pressed="true"] {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
    background: none;
  }

  > .vn-stars,
  > .vn-pdot,
  > .v-icon {
    margin-left: auto;
  }
}

// -> Multi-select groups: a checkbox marks the choice, the row keeps no fill
.vn-cat .vn-opts.is-multi .vn-opt[aria-pressed="true"] {
  background: none;
  color: var(--ink);
  font-weight: 400;

  &:hover {
    background: var(--sunken);
  }
}

.vn-cbox {
  width: 16px;
  height: 16px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--muted);
  border-radius: 4px;

  &::after {
    content: "";
    width: 4px;
    height: 8px;
    border: solid var(--on-accent);
    border-width: 0 2px 2px 0;
    transform: translateY(-1px) rotate(45deg);
    opacity: 0;
  }

  [aria-pressed="true"] > & {
    border-color: var(--accent);
    background: var(--accent);

    &::after {
      opacity: 1;
    }
  }
}

// ---------------------------------
// RESULTS
// ---------------------------------

.vn-results {
  display: grid;
  gap: 28px;
  min-width: 0;
}

.vn-group {
  display: grid;
  gap: 10px;

  h2 {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 700;
  }
}

.vn-group__n {
  font: 500 0.8125rem var(--font-mono);
  color: var(--muted);
}

.vn-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 10px;
}

.vn-acard {
  display: grid;
  align-content: space-between;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink) !important;
  text-decoration: none !important;

  &:hover {
    border-color: var(--accent);
  }

  &.is-skipped .vn-acard__t {
    color: var(--muted);
  }

  &.is-ext .vn-acard__t::after {
    content: " ↗";
    color: var(--muted);
  }
}

.vn-acard__t {
  font-weight: 600;
  line-height: 1.35;
}

.vn-acard__m {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 12px;
  font-size: 0.8125rem;
  color: var(--muted);
}

.vn-cat__empty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  color: var(--muted);
}

@media (max-width: 900px) {
  .vn-cat {
    padding-top: 24px;
  }
  .vn-cat__layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    padding-top: 8px;
  }
  .vn-facets {
    position: static;
    max-height: none;
    overflow: visible;
    gap: 10px;
  }
  .vn-facet {
    padding-top: 0;
    border-top: 0;

    h2 {
      margin: 0 0 6px 2px;
      font-size: 0.8125rem;
      color: var(--muted);
    }
  }
  .vn-facet__head {
    margin: 0 0 6px 2px;
  }
  .vn-opts {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    hr {
      display: none;
    }
  }
  .vn-cat .vn-opt {
    width: auto;
    flex: none;
    min-height: 36px;
    padding: 6px 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    white-space: nowrap;
  }
}
</style>
