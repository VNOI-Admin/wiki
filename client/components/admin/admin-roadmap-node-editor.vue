<template lang="pug">
  v-card.mb-2(flat, outlined)
    v-card-text.pa-2
      .d-flex.align-center
        v-icon.drag-handle(style='cursor:grab; color: rgba(0,0,0,0.3)') mdi-drag-horizontal-variant
        v-btn(icon, x-small, @click='expanded = !expanded')
          v-icon(x-small) {{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
        .node-collapsed-title.ml-2.body-2.flex-grow-1 {{ node.title || '(untitled node)' }}
        v-rating.mr-2(
          v-if='!expanded'
          :value='node.difficulty'
          half-increments
          readonly
          dense
          x-small
          color='amber darken-1'
          background-color='grey lighten-1'
          :length='5'
        )
        v-btn(icon, x-small, color='error', @click='$emit("remove")')
          v-icon(x-small) mdi-delete-outline
      v-expand-transition
        div(v-show='expanded')
          v-divider.mt-2
          .node-form.pa-2
            v-autocomplete(
              v-model='selectedPage'
              :items='searchResults'
              :loading='searching'
              :search-input.sync='searchQuery'
              item-text='title'
              item-value='id'
              label='Wiki Article'
              placeholder='Search for an article...'
              prepend-inner-icon='mdi-text-box-search-outline'
              dense
              outlined
              hide-details='auto'
              clearable
              return-object
              no-filter
              class='mb-2'
              @input='onPageSelected'
              @click:clear='onPageCleared'
            )
              template(v-slot:item='{ item }')
                v-list-item-content
                  v-list-item-title {{ item.title }}
                  v-list-item-subtitle.caption {{ item.locale }}/{{ item.path }}
                  v-list-item-subtitle.caption.grey--text(v-if='item.description') {{ item.description }}
              template(v-slot:no-data)
                v-list-item
                  v-list-item-title.caption.grey--text
                    | {{ searchQuery && searchQuery.length >= 2 ? 'No articles found' : 'Type to search articles...' }}
              template(v-slot:selection='{ item }')
                span.caption {{ item.locale }}/{{ item.path }}
            v-text-field(
              v-model='node.title'
              label='Title'
              dense
              outlined
              hide-details='auto'
              class='mb-2'
            )
            v-textarea(
              v-model='node.description'
              label='Description'
              dense
              outlined
              hide-details='auto'
              rows='2'
              class='mb-2'
              auto-grow
            )
            .d-flex.align-center.mb-2
              .caption.mr-3 Difficulty
              v-rating(
                v-model='node.difficulty'
                half-increments
                dense
                small
                color='amber darken-1'
                background-color='grey lighten-1'
                :length='5'
                clearable
              )
              v-btn(v-if='node.difficulty > 0', icon, x-small, @click='node.difficulty = 0')
                v-icon(x-small) mdi-close
            v-text-field(
              v-model='node.externalUrl'
              label='External URL (https://...)'
              dense
              outlined
              hide-details='auto'
              :error='externalUrlError'
              :error-messages='externalUrlError ? "Must be a valid http/https URL" : ""'
              clearable
            )
</template>

<script>
import gql from 'graphql-tag'

const SEARCH_QUERY = gql`
  query ($query: String!) {
    pages {
      search(query: $query) {
        results {
          id
          title
          description
          path
          locale
        }
      }
    }
  }
`

export default {
  props: {
    node: { type: Object, required: true }
  },
  data () {
    // Reconstruct a minimal item from saved articlePath so the field shows on re-open
    let selectedPage = null
    const ap = this.node.articlePath
    if (ap) {
      const slash = ap.indexOf('/')
      if (slash >= 0) {
        selectedPage = { id: 0, locale: ap.slice(0, slash), path: ap.slice(slash + 1), title: ap, description: '' }
      }
    }
    return {
      expanded: false,
      searchQuery: '',
      searchResults: selectedPage ? [selectedPage] : [],
      searching: false,
      selectedPage
    }
  },
  computed: {
    externalUrlError () {
      if (!this.node.externalUrl) return false
      return !/^https?:\/\//.test(this.node.externalUrl)
    }
  },
  watch: {
    searchQuery (val) {
      // After selection Vuetify clears search-input → val becomes null/empty.
      // Only clear results when the user has no selection and isn't typing.
      clearTimeout(this._searchTimer)
      if (val && val.length >= 2) {
        this._searchTimer = setTimeout(() => this.doSearch(val), 300)
      } else if (!this.selectedPage) {
        this.searchResults = []
      }
    }
  },
  methods: {
    async doSearch (query) {
      this.searching = true
      try {
        const resp = await this.$apollo.query({
          query: SEARCH_QUERY,
          variables: { query },
          fetchPolicy: 'network-only'
        })
        const results = (resp.data && resp.data.pages && resp.data.pages.search && resp.data.pages.search.results) || []
        // Always keep the currently selected item in the list so it remains visible
        if (this.selectedPage && !results.find(r => r.id === this.selectedPage.id)) {
          this.searchResults = [this.selectedPage, ...results]
        } else {
          this.searchResults = results
        }
      } catch (e) {
        this.searchResults = this.selectedPage ? [this.selectedPage] : []
      } finally {
        this.searching = false
      }
    },
    onPageSelected (page) {
      if (!page) return
      // Pin the selected item in results so Vuetify can always find it for display
      this.searchResults = [page]
      this.node.articlePath = `${page.locale}/${page.path}`
      // Pre-fill title if currently empty or was previously auto-filled
      if (!this.node.title || this.node.title === this._lastAutoTitle) {
        this.node.title = page.title
        this._lastAutoTitle = page.title
      }
      // Pre-fill description if currently empty or was previously auto-filled
      if ((!this.node.description || this.node.description === this._lastAutoDescription) && page.description) {
        this.node.description = page.description
        this._lastAutoDescription = page.description
      }
    },
    onPageCleared () {
      this.selectedPage = null
      this.node.articlePath = ''
      this.searchResults = []
    }
  }
}
</script>
