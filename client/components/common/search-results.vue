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
          :aria-expanded='results.length + suggestions.length > 0 ? `true` : `false`'
          :aria-activedescendant='cursor >= 0 ? `vn-hit-` + cursor : null'
          :placeholder='$t(`common:header.searchPlaceholder`, `Tìm bài: DFS, quy hoạch động, segment tree…`)'
          :aria-label='$t(`common:header.search`, `Tìm bài viết`)'
          @keydown.down.prevent='move(1)'
          @keydown.up.prevent='move(-1)'
          @keydown.enter.prevent='enter'
          )
        button.vn-search__esc(type='button', @click='close') Esc
      #vn-search-list.vn-search__out(ref='out', role='listbox', :aria-label='$t(`common:header.search`, `Tìm bài viết`)')
        template(v-if='search && search.length >= 2')
          .vn-search__empty(v-if='loadError', role='alert')
            span {{$t('common:header.searchError', 'Không tải được kết quả.')}}
            button.vn-search__retry(type='button', @click='$apollo.queries.response.refetch()') {{$t('common:actions.retry', 'Thử lại')}}
          .vn-search__skel(v-else-if='searchIsLoading && results.length < 1', role='status', :aria-label='$t(`common:header.searchLoading`)')
            i
            i
            i
          .vn-search__empty(v-else-if='results.length < 1') {{$t('common:header.searchNoResult')}}
          template(v-else)
            .vn-search__grp(role='presentation') {{$t('common:header.searchResultsCount', { total: hits })}}
            a.vn-hit(
              v-for='(item, idx) of results'
              :key='item.id'
              :id='`vn-hit-` + idx'
              role='option'
              :href='`/${item.locale}/${item.path}`'
              :aria-selected='idx === cursor ? `true` : `false`'
              @mousemove='cursor = idx'
              )
              span.vn-hit__t {{item.title}}
              status-mark.vn-hit__mark(v-if='statusFor(item)', :status='statusFor(item)', :title='statusFor(item).label')
              span.vn-hit__x(v-if='item.snippet')
                template(v-for='(part, pi) of markParts(item.snippet)')
                  mark(v-if='part.hit', :key='pi') {{ part.text }}
                  template(v-else) {{ part.text }}
              span.vn-hit__s(v-else-if='item.description') {{item.description}}
              span.vn-hit__p /{{item.path}}
            button.vn-search__more(v-if='results.length < response.results.length', type='button', @click='shown += perPage') {{$t('common:header.searchMore', 'Xem thêm')}}
          template(v-if='suggestions.length > 0')
            .vn-search__grp(role='presentation') {{$t('common:header.searchDidYouMean')}}
            button.vn-hit(
              v-for='(term, idx) of suggestions'
              :key='term'
              :id='`vn-hit-` + (idx + results.length)'
              role='option'
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
import StatusMark from './status-mark.vue'

/**
 * Lowercase, and remove the Vietnamese marks of each character.
 * Each character stays one character, so a match position in the result is the same in the input.
 */
function foldText (text) {
  return Array.from(String(text || ''), c => {
    const f = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    if (f === 'đ') { return 'd' }
    // -> One UTF-16 unit per character, so indexOf positions match the Array.from positions
    return f.length === 1 ? f : '\ufffd'
  }).join('')
}

export default {
  components: { StatusMark },
  data() {
    return {
      cursor: -1,
      loadError: false,
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
    results() {
      return this.response.results ? _.take(this.response.results, this.shown) : []
    },
    hits() {
      return this.response.totalHits ? this.response.totalHits : 0
    },
    suggestions() {
      return this.response.suggestions ? this.response.suggestions : []
    },
    // -> Query words without Vietnamese marks, for the excerpt marks
    markTerms() {
      return _.uniq(String(this.search || '').split(/\s+/).map(foldText).filter(t => t.length > 1))
    }
  },
  watch: {
    searchIsFocused (open) {
      if (open) {
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
    results() {
      this.cursor = -1
    }
  },
  methods: {
    /**
     * Split an excerpt into parts, so the query words show in a mark element.
     * The excerpt is text only: the template renders each part as text, never as HTML.
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

.vn-hit__s, .vn-hit__p {
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

.vn-hit__p {
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
</style>
