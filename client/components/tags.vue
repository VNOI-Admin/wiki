<template lang='pug'>
  v-app(:dark='$vuetify.theme.dark').tags
    nav-header
    v-main.vn-tool
      header.vn-ptop
        h1 {{$t('common:header.browseTags')}}
        .vn-ptop__acts(v-if='selection.length > 0')
          button.vn-btn.is-ghost(type='button', @click='selection = []')
            v-icon(small) mdi-close
            span {{$t('tags:clearSelection')}}
      //- All tags as chips: a chip adds its tag to the selection (the side drawer did not fit phones)
      .vn-pbody.vn-tagpick(role='group', :aria-label='$t(`tags:selectOneMoreTags`)')
        button.vn-chip(
          v-for='tag of sortedTags'
          :key='`tag-` + tag.tag'
          type='button'
          :aria-pressed='isSelected(tag.tag) ? `true` : `false`'
          @click='toggleTag(tag.tag)'
          ) \#{{tag.title}}
      v-toolbar.vn-tagbar(flat, height='58')
        v-text-field.tags-search(
          v-model='innerSearch'
          :label='$t(`tags:searchWithinResultsPlaceholder`)'
          solo
          hide-details
          flat
          rounded
          single-line
          height='40'
          prepend-icon='mdi-text-box-search-outline'
          append-icon='mdi-arrow-right'
          clearable
          :aria-label='$t(`tags:searchWithinResultsPlaceholder`)'
        )
        template(v-if='locales.length > 1')
          v-divider.mx-3(vertical)
          .overline {{$t('tags:locale')}}
          v-select.ml-2(
            :items='locales'
            v-model='locale'
            :background-color='$vuetify.theme.dark ? `grey darken-3` : `white`'
            hide-details
            :label='$t(`tags:locale`)'
            :aria-label='$t(`tags:locale`)'
            item-text='name'
            item-value='code'
            rounded
            single-line
            dense
            height='40'
            style='max-width: 170px;'
          )
        v-divider.mx-3(vertical)
        .overline {{$t('tags:orderBy')}}
        v-select.ml-2(
          :items='orderByItems'
          v-model='orderBy'
          :background-color='$vuetify.theme.dark ? `grey darken-3` : `white`'
          hide-details
          :label='$t(`tags:orderBy`)'
          :aria-label='$t(`tags:orderBy`)'
          rounded
          single-line
          dense
          height='40'
          style='max-width: 250px;'
        )
        v-btn-toggle.ml-2(v-model='orderByDirection', rounded, mandatory)
          v-btn(text, height='40', :aria-label='$t(`tags:orderAscending`, `Tăng dần`)'): v-icon(size='20') mdi-chevron-double-up
          v-btn(text, height='40', :aria-label='$t(`tags:orderDescending`, `Giảm dần`)'): v-icon(size='20') mdi-chevron-double-down
      v-divider
      .text-center.pt-10(v-if='selection.length < 1')
        img(src='/_assets/svg/icon-price-tag.svg', alt='')
        .subtitle-2.grey--text {{$t('tags:selectOneMoreTagsHint')}}
      .py-2(v-else)
        v-data-iterator(
          :items='pages'
          :items-per-page='4'
          :search='innerSearch'
          :loading='isLoading'
          :options.sync='pagination'
          @page-count='pageTotal = $event'
          hide-default-footer
          ref='dude'
          )
          template(v-slot:loading)
            .text-center.pt-10
              v-progress-circular(
                indeterminate
                color='primary'
                size='96'
                width='2'
                )
              .subtitle-2.grey--text.mt-5 {{$t('tags:retrievingResultsLoading')}}
          template(v-slot:no-data)
            .text-center.pt-10
              img(src='/_assets/svg/icon-info.svg', alt='')
              .subtitle-2.grey--text {{$t('tags:noResults')}}
          template(v-slot:no-results)
            .text-center.pt-10
              img(src='/_assets/svg/icon-info.svg', alt='')
              .subtitle-2.grey--text {{$t('tags:noResultsWithFilter')}}
          template(v-slot:default='props')
            v-row(align='stretch')
              v-col(
                v-for='item of props.items'
                :key='`page-` + item.id'
                cols='12'
                lg='6'
                )
                v-card.radius-7(
                  @click='goTo(item)'
                  style='height:100%;'
                  :class='$vuetify.theme.dark ? `grey darken-4` : ``'
                  )
                  v-card-text
                    .d-flex.flex-row.align-center
                      .body-1: strong.primary--text {{item.title}}
                      v-spacer
                      i18next.caption(tag='div', path='tags:pageLastUpdated')
                        span(place='date') {{item.updatedAt | moment('from')}}
                    .body-2.grey--text {{item.description || '---'}}
                    v-divider.my-2
                    .d-flex.flex-row.align-center
                      v-chip(small, label, :color='$vuetify.theme.dark ? `grey darken-3-l5` : `grey lighten-4`').overline {{item.locale}}
                      .caption.ml-1 / {{item.path}}
        .text-center.py-2.animated.fadeInDown(v-if='this.pageTotal > 1')
          v-pagination(v-model='pagination.page', :length='pageTotal')

    nav-footer
    notify
    search-results
</template>

<script>
import VueRouter from 'vue-router'
import _ from 'lodash'

import tagsQuery from 'gql/common/common-pages-query-tags.gql'
import { NO_PROGRESS_TAG } from '../modules/progress'
import pagesQuery from 'gql/common/common-pages-query-list.gql'

/* global siteLangs */

const router = new VueRouter({
  mode: 'history',
  base: '/t'
})

export default {
  i18nOptions: { namespaces: 'tags' },
  data() {
    return {
      tags: [],
      selection: [],
      innerSearch: '',
      locale: 'any',
      locales: [],
      orderBy: 'title',
      orderByDirection: 0,
      pagination: {
        page: 1,
        itemsPerPage: 12,
        mustSort: true,
        sortBy: ['title'],
        sortDesc: [false]
      },
      pages: [],
      pageTotal: 0,
      isLoading: true
    }
  },
  computed: {
    sortedTags () {
      return _.sortBy(this.tags, t => t.title.toLowerCase())
    },
    orderByItems () {
      return [
        { text: this.$t('tags:orderByField.creationDate'), value: 'createdAt' },
        { text: this.$t('tags:orderByField.ID'), value: 'id' },
        { text: this.$t('tags:orderByField.lastModified'), value: 'updatedAt' },
        { text: this.$t('tags:orderByField.path'), value: 'path' },
        { text: this.$t('tags:orderByField.title'), value: 'title' }
      ]
    }
  },
  watch: {
    locale (newValue, oldValue) {
      this.rebuildURL()
    },
    orderBy (newValue, oldValue) {
      this.rebuildURL()
      this.pagination.sortBy = [newValue]
    },
    orderByDirection (newValue, oldValue) {
      this.rebuildURL()
      this.pagination.sortDesc = [newValue === 1]
    }
  },
  router,
  created () {
    this.$store.commit('page/SET_MODE', 'tags')
    this.selection = _.compact(decodeURI(this.$route.path).split('/'))
  },
  mounted () {
    this.locales = _.concat(
      [{name: this.$t('tags:localeAny'), code: 'any'}],
      (siteLangs.length > 0 ? siteLangs : [])
    )
    if (this.$route.query.lang) {
      this.locale = this.$route.query.lang
    }
    if (this.$route.query.sort) {
      this.orderBy = this.$route.query.sort.toLowerCase()
      switch (this.orderBy) {
        case 'updatedat':
          this.orderBy = 'updatedAt'
          break
      }
      this.pagination.sortBy = [this.orderBy]
    }
    if (this.$route.query.dir) {
      this.orderByDirection = this.$route.query.dir === 'asc' ? 0 : 1
      this.pagination.sortDesc = [this.orderByDirection === 1]
    }
  },
  methods: {
    toggleTag (tag) {
      if (_.includes(this.selection, tag)) {
        this.selection = _.without(this.selection, tag)
      } else {
        this.selection.push(tag)
      }
      this.rebuildURL()
    },
    isSelected (tag) {
      return _.includes(this.selection, tag)
    },
    rebuildURL () {
      let urlObj = {
        path: '/' + this.selection.join('/')
      }
      if (this.locale !== `any`) {
        _.set(urlObj, 'query.lang', this.locale)
      }
      if (this.orderBy !== `TITLE`) {
        _.set(urlObj, 'query.sort', this.orderBy.toLowerCase())
      }
      if (this.orderByDirection !== 0) {
        _.set(urlObj, 'query.dir', this.orderByDirection === 0 ? `asc` : `desc`)
      }
      this.$router.push(urlObj)
    },
    goTo (page) {
      window.location.assign(`/${page.locale}/${page.path}`)
    }
  },
  apollo: {
    tags: {
      query: tagsQuery,
      fetchPolicy: 'cache-and-network',
      // -> The progress opt-out tag is a setting, not a topic: don't list it
      update: (data) => _.cloneDeep(data.pages.tags).filter(t => t.tag !== NO_PROGRESS_TAG),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'tags-refresh')
      }
    },
    pages: {
      query: pagesQuery,
      fetchPolicy: 'cache-and-network',
      update: (data) => _.cloneDeep(data.pages.list),
      watchLoading (isLoading) {
        this.isLoading = isLoading
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'pages-refresh')
      },
      variables () {
        return {
          locale: this.locale === 'any' ? null : this.locale,
          tags: this.selection
        }
      },
      skip () {
        return this.selection.length < 1
      }
    }
  }
}
</script>

<style lang='scss'>
.vn-tagpick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 16px;
}

// -> The search and sort bar shares the left and right edges of the page head
.vn-tagbar.v-toolbar {
  // -> The 20px page gutter on each side, at every width
  width: calc(100% - 40px);
  max-width: calc(var(--wrap) - 40px);
  margin: 0 auto;
  border: 1px solid var(--line);
  border-radius: 12px !important;
  background: var(--surface) !important;
}

// -> Phones: the search field takes one row, the sort controls the next
@media (max-width: 640px) {
  .vn-tagbar.v-toolbar {
    height: auto !important;

    .v-toolbar__content {
      height: auto !important;
      flex-wrap: wrap;
      gap: 8px 0;
      padding-block: 8px;
    }

    .tags-search {
      flex-basis: 100%;
    }

    .v-divider--vertical, .overline {
      display: none;
    }
  }
}

.tags .v-data-iterator {
  max-width: var(--wrap);
  margin: 0 auto;
  padding-inline: 20px;
}
.tags-search {
  .v-input__control {
    min-height: initial !important;
  }
  .v-input__prepend-outer {
    margin-top: 8px !important;
  }
}
</style>
