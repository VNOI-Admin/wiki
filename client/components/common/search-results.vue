<template lang="pug">
  .vn-search(v-if='searchIsFocused', @keydown.esc.stop='close', @keydown.tab='trapFocus')
    .vn-search__scrim(@click='close')
    .vn-search__box(ref='box', role='dialog', aria-modal='true', :aria-label='$t(`common:header.search`, `Tìm bài viết`)')
      .vn-search__in
        v-icon mdi-magnify
        input(
          ref='input'
          v-model='search'
          type='search'
          autocomplete='off'
          spellcheck='false'
          role='combobox'
          aria-autocomplete='list'
          aria-controls='vn-search-list'
          :aria-expanded='options.length > 0 ? `true` : `false`'
          :aria-activedescendant='cursor >= 0 ? `vn-hit-` + cursor : null'
          :placeholder='$t(`common:header.searchPlaceholder`, `Tìm bài: DFS, quy hoạch động, segment tree…`)'
          :aria-label='$t(`common:header.search`, `Tìm bài viết`)'
          @keydown.down.prevent='move(1)'
          @keydown.up.prevent='move(-1)'
          @keydown.enter.prevent='enter'
          )
        button.vn-search__esc(type='button', @click='close') Esc
      #vn-search-list.vn-search__out(ref='out', role='listbox', :aria-label='$t(`common:header.search`, `Tìm bài viết`)')
        //- No query yet: common topics
        .vn-search__tips(v-if='!term')
          span {{$t('common:header.searchTips', 'Gợi ý:')}}
          button.vn-chip(v-for='p of popular', :key='p', type='button', @click='setSearchTerm(p)') {{ p }}
        template(v-else-if='term.length >= 2')
          template(v-for='g of groups')
            .vn-search__grp(role='presentation', :key='`g-` + g.key') {{ g.label }}
            template(v-for='row of g.rows')
              button.vn-hit(
                v-if='row.kind === `suggest`'
                :key='row.key'
                :id='`vn-hit-` + row.idx'
                role='option'
                type='button'
                :aria-selected='row.idx === cursor ? `true` : `false`'
                @click='setSearchTerm(row.term)'
                )
                span.vn-hit__t {{ row.term }}
              a.vn-hit(
                v-else
                :key='row.key'
                :id='`vn-hit-` + row.idx'
                role='option'
                :href='row.href'
                :target='row.external ? `_blank` : null'
                :rel='row.external ? `noopener` : null'
                :aria-selected='row.idx === cursor ? `true` : `false`'
                @mousemove='cursor = row.idx'
                @click='onOpen(row)'
                )
                span.vn-hit__t
                  template(v-for='(part, pi) of markParts(row.title)')
                    mark(v-if='part.hit', :key='pi') {{ part.text }}
                    template(v-else) {{ part.text }}
                span.vn-hit__end
                  vn-stars(v-if='row.stars', :value='row.stars')
                  em.vn-hit__soon(v-if='row.soon') {{$t('common:roadmap.noArticle', 'Chưa có bài')}}
                  status-mark(v-if='row.status', :status='row.status', :title='row.status.label')
                span.vn-hit__x(v-if='row.snippet')
                  template(v-for='(part, pi) of markParts(row.snippet)')
                    mark(v-if='part.hit', :key='pi') {{ part.text }}
                    template(v-else) {{ part.text }}
                span.vn-hit__s(v-else-if='row.sub')
                  | {{ row.sub }}
                  span.vn-hit__syn(v-if='row.syn')  · {{ synLabel(row.syn) }}
            button.vn-search__more(v-if='g.key === `text` && moreText', :key='`more-` + g.key', type='button', @click='shown += perPage') {{$t('common:header.searchMore', 'Xem thêm')}}
          //- The text search: error, loading and empty states
          .vn-search__empty(v-if='loadError', role='alert')
            span {{$t('common:header.searchError', 'Không tải được kết quả.')}}
            button.vn-search__retry(type='button', @click='$apollo.queries.response.refetch()') {{$t('common:actions.retry', 'Thử lại')}}
          .vn-search__skel(v-else-if='searchIsLoading && textHits.length < 1', role='status', :aria-label='$t(`common:header.searchLoading`)')
            i
            i
            i
          .vn-search__empty(v-else-if='options.length < 1') {{$t('common:header.searchNoResult')}}
</template>

<script>
import _ from 'lodash'
import { sync } from 'vuex-pathify'

import searchPagesQuery from 'gql/common/common-pages-query-search.gql'
import searchIndexQuery from 'gql/common/common-catalog-query-search-index.gql'
import StatusMark from './status-mark.vue'
import VnStars from './vn-stars.vue'
import { POPULAR_TERMS, foldText, rankArticles, rankRoadmapItems } from '../../modules/search-rank'
import { touchRoadmap } from '../../modules/roadmap-context'

/* global siteConfig */

export default {
  components: { StatusMark, VnStars },
  data() {
    return {
      cursor: -1,
      loadError: false,
      shown: 10,
      perPage: 10,
      popular: POPULAR_TERMS,
      // -> Catalogue titles and roadmap items, loaded when the dialog first opens
      index: null,
      response: {
        results: [],
        suggestions: [],
        totalHits: 0
      }
    }
  },
  computed: {
    search: sync('site/search'),
    searchIsFocused: sync('site/searchIsFocused'),
    searchIsLoading: sync('site/searchIsLoading'),
    term () {
      return String(this.search || '').trim()
    },
    locale () {
      return this.$store.get('page/locale') || siteConfig.lang
    },
    titleHits () {
      return this.index ? rankArticles(this.index.articles, this.term) : []
    },
    roadmapHits () {
      return this.index ? rankRoadmapItems(this.index.roadmapItems, this.term) : []
    },
    // -> Text hits that the title group does not already show
    textAll () {
      const shown = new Set(this.titleHits.map(h => h.article.href.replace(/^\//, '')))
      return (this.response.results || []).filter(item => !shown.has(item.path) && !shown.has(`${item.locale}/${item.path}`))
    },
    textHits () {
      return _.take(this.textAll, this.shown)
    },
    moreText () {
      return this.textAll.length > this.shown
    },
    suggestions() {
      return this.response.suggestions ? this.response.suggestions : []
    },
    // -> The rows in display order: each row has its index in the keyboard order
    groups () {
      this.$progress.state.records // eslint-disable-line no-unused-expressions
      const groups = []
      let idx = 0
      const add = (key, label, rows) => {
        if (rows.length > 0) { groups.push({ key, label, rows: rows.map(r => ({ ...r, idx: idx++ })) }) }
      }
      add('titles', this.$t('common:header.searchTitles', 'Bài viết'), this.titleHits.map(({ article, syn }) => ({
        kind: 'title',
        key: `a:${article.href}`,
        href: article.href,
        external: !article.href.startsWith('/'),
        title: article.title,
        stars: article.stars,
        sub: article.topic,
        syn,
        status: this.statusFor(article.href)
      })))
      add('text', this.$t('common:header.searchText', 'Trong nội dung'), this.textHits.map(item => ({
        kind: 'text',
        key: `t:${item.id}`,
        href: `/${item.locale}/${item.path}`,
        title: item.title,
        snippet: item.snippet,
        sub: item.snippet ? '' : (item.description || `/${item.path}`),
        status: this.statusFor(`/${item.locale}/${item.path}`)
      })))
      add('roadmap', this.$t('common:header.searchRoadmap', 'Mục lộ trình'), this.roadmapHits.map(item => ({
        kind: 'roadmap',
        key: `r:${item.roadmapId}:${item.stage}:${item.title}`,
        href: item.href || `/roadmap/${item.roadmapId}`,
        external: !!item.href && !item.href.startsWith('/'),
        roadmapId: item.roadmapId,
        title: item.title,
        soon: !item.href,
        sub: this.$t('common:header.searchStage', { defaultValue: '{{roadmap}} · Chặng {{n}}: {{stage}}', roadmap: item.roadmapTitle, n: item.stage, stage: item.stageTitle })
      })))
      add('suggest', this.$t('common:header.searchDidYouMean'), this.suggestions.map(term => ({ kind: 'suggest', key: `s:${term}`, term })))
      return groups
    },
    options () {
      return _.flatMap(this.groups, 'rows')
    },
    // -> Query words without Vietnamese marks, for the marks in titles and excerpts
    markTerms() {
      return _.uniq(this.term.split(/\s+/).map(foldText).filter(t => t.length > 1))
    }
  },
  watch: {
    searchIsFocused (open) {
      if (open) {
        this.loadIndex()
        // -> Give focus back to the control that opened the dialog
        this.returnFocus = document.activeElement
        this.$nextTick(() => { this.$refs.input && this.$refs.input.focus() })
      } else if (this.returnFocus && this.returnFocus.focus) {
        this.returnFocus.focus()
        this.returnFocus = null
      }
    },
    search(newValue, oldValue) {
      this.cursor = -1
      if (!newValue || (newValue && newValue.length < 2)) {
        this.searchIsLoading = false
      } else {
        this.searchIsLoading = true
      }
    },
    options() {
      this.cursor = -1
    }
  },
  methods: {
    /**
     * Load the catalogue titles and the roadmap items once. Without them, the dialog
     * still shows the text search.
     */
    async loadIndex () {
      if (this.index || this.indexLoading) { return }
      this.indexLoading = true
      try {
        const resp = await this.$apollo.query({ query: searchIndexQuery, variables: { locale: this.locale } })
        this.index = _.get(resp, 'data.catalog.searchIndex', null)
      } catch (err) {
        console.warn('[search] failed to load the article index', err)
      } finally {
        this.indexLoading = false
      }
    },
    /**
     * Split a text into parts, so the query words show in a mark element.
     * The text is plain text: the template renders each part as text, never as HTML.
     */
    markParts (text) {
      const chars = Array.from(text)
      const folded = foldText(text)
      const hit = new Array(chars.length).fill(false)
      for (const term of this.markTerms) {
        let at = folded.indexOf(term)
        while (at >= 0) {
          for (let i = at; i < at + term.length; i++) { hit[i] = true }
          at = folded.indexOf(term, at + term.length)
        }
      }
      const parts = []
      chars.forEach((c, i) => {
        const last = parts[parts.length - 1]
        if (last && last.hit === hit[i]) {
          last.text += c
        } else {
          parts.push({ text: c, hit: hit[i] })
        }
      })
      return parts
    },
    synLabel (syn) {
      return this.$t('common:header.searchSynonym', { defaultValue: 'khớp "{{term}}"', term: syn })
    },
    // -> Tab and Shift+Tab stay inside the dialog
    trapFocus (ev) {
      const items = Array.from(this.$refs.box.querySelectorAll('input, button, a[href]'))
      if (items.length < 1) { return }
      const first = items[0]
      const last = items[items.length - 1]
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault()
        last.focus()
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault()
        first.focus()
      }
    },
    close () {
      this.searchIsFocused = false
      this.search = ''
    },
    move (step) {
      const max = this.options.length - 1
      this.cursor = Math.max(-1, Math.min(max, this.cursor + step))
      this.$nextTick(() => {
        const el = this.$refs.out && this.$refs.out.querySelector('[aria-selected="true"]')
        if (el) { el.scrollIntoView({ block: 'nearest' }) }
      })
    },
    enter () {
      const row = this.options[Math.max(0, this.cursor)]
      if (!row) { return }
      if (row.kind === 'suggest') {
        this.setSearchTerm(row.term)
        return
      }
      this.onOpen(row)
      if (row.external) {
        window.open(row.href, '_blank', 'noopener')
      } else {
        window.location.assign(row.href)
      }
    },
    // -> A roadmap item opens its page with that roadmap in the rail
    onOpen (row) {
      if (row.kind === 'roadmap') { touchRoadmap(row.roadmapId) }
    },
    /**
     * Status to show beside a hit, by path: the hit id depends on the search engine.
     *
     * @param {string} href
     * @returns {Object|null} Status to show, or null when there is nothing to mark
     */
    statusFor (href) {
      if (!this.$progress.isEnabled || !href.startsWith('/')) { return null }
      const status = this.$progress.getStatusByHref(href)
      return (status && status.showMarker) ? status : null
    },
    setSearchTerm(term) {
      this.search = term
      this.$nextTick(() => { this.$refs.input && this.$refs.input.focus() })
    }
  },
  apollo: {
    response: {
      query: searchPagesQuery,
      variables() {
        return {
          query: this.term
        }
      },
      fetchPolicy: 'network-only',
      debounce: 300,
      throttle: 1000,
      skip() {
        return this.term.length < 2
      },
      // -> A failed search must not look like "no results". The client error policy also
      //    sends a failed result here, after error().
      result({ error }) {
        this.loadError = Boolean(error)
        this.shown = this.perPage
      },
      error() {
        this.loadError = true
      },
      update: (data) => _.get(data, 'pages.search', {}),
      watchLoading (isLoading) {
        this.searchIsLoading = isLoading
      }
    }
  }
}
</script>

<style lang="scss">
.vn-search {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  justify-items: center;
  align-items: start;
  padding: 10vh 16px 16px;
}

.vn-search__scrim {
  position: absolute;
  inset: 0;
  background: var(--scrim);
}

.vn-search__box {
  position: relative;
  width: 100%;
  max-width: 40rem;
  max-height: 75vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow);
  text-align: left;
}

.vn-search__in {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);

  .v-icon {
    color: var(--accent) !important;
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font: 400 1.0625rem var(--font-ui);
    color: var(--ink);
  }
}

.vn-search__esc {
  font: 500 0.75rem var(--font-mono);
  border: 1px solid var(--line);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 1px 6px;
  color: var(--muted);
}

.vn-search__out {
  overflow: auto;
  padding: 8px;

  &:empty {
    display: none;
  }
}

.vn-search__grp {
  padding: 10px 10px 4px;
  font: 600 0.75rem/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.vn-search__empty {
  padding: 18px 10px;
  color: var(--muted);
}

.vn-search__retry {
  margin-left: 8px;
  color: var(--accent);
  font: inherit;
}

.vn-search__more {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  color: var(--accent);
  font-weight: 600;

  &:hover {
    background: var(--sunken);
  }
}

.vn-search__skel {
  display: grid;
  gap: 10px;
  padding: 12px;

  i {
    height: 14px;
    border-radius: 4px;
    background: var(--sunken);
    animation: vnSkel 1.2s ease-in-out infinite alternate;
  }

  i:nth-child(2) { width: 80%; }
  i:nth-child(3) { width: 60%; }
}

@keyframes vnSkel {
  to { opacity: 0.45; }
}

.vn-hit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  align-items: center;
  color: var(--ink) !important;
  text-align: left;
  text-decoration: none !important;

  &[aria-selected='true'] {
    background: var(--accent-soft);
  }
}

.vn-hit__t {
  font-weight: 500;
}

.vn-hit__s {
  grid-column: 1;
  font-size: 0.8125rem;
  color: var(--muted);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.vn-hit__x {
  grid-column: 1;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--muted);

  // -> The selected row has the soft accent background, so a mark has no background
  mark {
    background: none;
    color: var(--ink);
    font-weight: 600;
  }
}

// -> Stars, the status and the "Chưa có bài" tag: on the right of line 1
.vn-hit__end {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.vn-hit__t mark {
  background: none;
  color: var(--accent);
  font-weight: 700;
}

.vn-hit__syn {
  font: 500 0.75rem var(--font-mono);
}

.vn-hit__soon {
  padding: 0 4px;
  border: 1px solid var(--line);
  border-radius: 4px;
  font: 500 0.75rem var(--font-mono);
  font-style: normal;
  color: var(--muted);
  white-space: nowrap;
}

.vn-search__tips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  font-size: 0.875rem;
  color: var(--muted);

  > span {
    margin-right: 2px;
  }
}
</style>
