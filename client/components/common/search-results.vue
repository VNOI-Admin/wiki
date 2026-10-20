<template lang="pug">
  .vn-search(v-if='searchIsFocused', @keydown.esc.stop='close')
    .vn-search__scrim(@click='close')
    .vn-search__box(role='dialog', aria-modal='true', :aria-label='$t(`common:header.search`, `Tìm bài viết`)')
      .vn-search__in
        v-icon mdi-magnify
        input(
          ref='input'
          v-model='search'
          type='search'
          autocomplete='off'
          spellcheck='false'
          :placeholder='$t(`common:header.searchPlaceholder`, `Tìm bài: DFS, quy hoạch động, segment tree…`)'
          :aria-label='$t(`common:header.search`, `Tìm bài viết`)'
          @keydown.down.prevent='move(1)'
          @keydown.up.prevent='move(-1)'
          @keydown.enter.prevent='enter'
          )
        button.vn-search__esc(type='button', @click='close') Esc
      .vn-search__out(ref='out')
        template(v-if='search && search.length >= 2')
          .vn-search__skel(v-if='searchIsLoading && results.length < 1', :aria-label='$t(`common:header.searchLoading`)')
            i
            i
            i
          .vn-search__empty(v-else-if='results.length < 1') {{$t('common:header.searchNoResult')}}
          template(v-else)
            .vn-search__grp {{$t('common:header.searchResultsCount', { total: hits })}}
            a.vn-hit(
              v-for='(item, idx) of results'
              :key='item.id'
              :href='`/${item.locale}/${item.path}`'
              :aria-selected='idx === cursor ? `true` : `false`'
              @mousemove='cursor = idx'
              )
              span.vn-hit__t {{item.title}}
              span.vn-hit__mark(v-if='statusFor(item)', :title='statusFor(item).label')
                v-icon(:color='statusFor(item).color', small) {{ statusFor(item).icon }}
              span.vn-hit__s(v-if='item.description') {{item.description}}
              span.vn-hit__p /{{item.path}}
            button.vn-search__more(v-if='results.length < response.results.length', type='button', @click='shown += perPage') {{$t('common:header.searchMore', 'Xem thêm')}}
          template(v-if='suggestions.length > 0')
            .vn-search__grp {{$t('common:header.searchDidYouMean')}}
            button.vn-hit(
              v-for='(term, idx) of suggestions'
              :key='term'
              type='button'
              :aria-selected='idx + results.length === cursor ? `true` : `false`'
              @click='setSearchTerm(term)'
              )
              span.vn-hit__t {{term}}
</template>

<script>
import _ from 'lodash'
import { sync } from 'vuex-pathify'

import searchPagesQuery from 'gql/common/common-pages-query-search.gql'

export default {
  data() {
    return {
      cursor: -1,
      shown: 10,
      perPage: 10,
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
    searchRestrictLocale: sync('site/searchRestrictLocale'),
    searchRestrictPath: sync('site/searchRestrictPath'),
    results() {
      return this.response.results ? _.take(this.response.results, this.shown) : []
    },
    hits() {
      return this.response.totalHits ? this.response.totalHits : 0
    },
    suggestions() {
      return this.response.suggestions ? this.response.suggestions : []
    }
  },
  watch: {
    searchIsFocused (open) {
      if (open) {
        this.$nextTick(() => { this.$refs.input && this.$refs.input.focus() })
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
    results() {
      this.cursor = -1
    }
  },
  methods: {
    close () {
      this.searchIsFocused = false
      this.search = ''
    },
    move (step) {
      const max = this.results.length + this.suggestions.length - 1
      this.cursor = Math.max(-1, Math.min(max, this.cursor + step))
      this.$nextTick(() => {
        const el = this.$refs.out && this.$refs.out.querySelector('[aria-selected="true"]')
        if (el) { el.scrollIntoView({ block: 'nearest' }) }
      })
    },
    enter () {
      if (this.cursor < 0 && this.results.length > 0) {
        this.cursor = 0
      }
      if (this.cursor >= 0 && this.cursor < this.results.length) {
        this.goToPage(_.nth(this.results, this.cursor))
      } else if (this.cursor >= this.results.length) {
        this.setSearchTerm(_.nth(this.suggestions, this.cursor - this.results.length))
      }
    },
    /**
     * Status to show beside a search hit.
     *
     * Resolves by path rather than by `item.id`: the id comes from whichever search
     * engine is configured, and only the DB engine guarantees it is the numeric
     * pages.id. Paths are reliable across every engine.
     *
     * @param {Object} item Search hit
     * @returns {Object|null} Status to show, or null when there is nothing to mark
     */
    statusFor (item) {
      if (!this.$progress.isEnabled) { return null }
      const status = this.$progress.getStatusByHref(`/${item.locale}/${item.path}`)
      return (status && status.showMarker) ? status : null
    },
    setSearchTerm(term) {
      this.search = term
    },
    goToPage(item) {
      window.location.assign(`/${item.locale}/${item.path}`)
    },
    goToPageInNewTab(item) {
      window.open(`/${item.locale}/${item.path}`, '_blank')
    }
  },
  apollo: {
    response: {
      query: searchPagesQuery,
      variables() {
        return {
          query: this.search
        }
      },
      fetchPolicy: 'network-only',
      debounce: 300,
      throttle: 1000,
      skip() {
        return !this.search || this.search.length < 2
      },
      result() {
        this.shown = this.perPage
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

.vn-hit__s, .vn-hit__p {
  grid-column: 1;
  font-size: 0.8125rem;
  color: var(--muted);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.vn-hit__p {
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
</style>
