<template lang="pug">
  v-app(:dark='$vuetify.theme.dark')
    nav-header
    v-main
      v-toolbar(:color='$vuetify.theme.dark ? `grey darken-4-d3` : `grey lighten-3`', flat, dense, v-if='$vuetify.breakpoint.smAndUp')
        v-breadcrumbs.breadcrumbs-nav.pl-0(:items='breadcrumbs', divider='/')
          template(slot='item', slot-scope='props')
            v-icon(v-if='props.item.path === "/"', small, @click='goHome') mdi-home
            v-btn.ma-0(v-else, :href='props.item.path', small, text) {{props.item.name}}
      v-divider
      v-container(fluid)
        v-row(justify='center')
          v-col(cols='12', lg='9', xl='7')
            v-card
              v-toolbar(color='primary', dark, dense, flat)
                v-icon(left) mdi-folder-open
                v-toolbar-title.subtitle-1 {{ folderTitle || path }}
                v-spacer
                v-btn(v-if='canWrite === `true`', :href='`/e/` + locale + `/` + path', small, outlined)
                  v-icon(left, small) mdi-plus
                  span Create page here
              v-list(v-if='parsedItems.length > 0', two-line)
                template(v-for='(item, idx) of parsedItems')
                  v-divider(v-if='idx > 0', :key='`div-` + item.id')
                  v-list-item(:key='item.id', :href='`/` + item.locale + `/` + item.path')
                    v-list-item-avatar
                      v-icon(:color='item.isFolder ? `amber darken-2` : `blue-grey`') {{ item.isFolder ? `mdi-folder` : `mdi-text-box` }}
                    v-list-item-content
                      v-list-item-title {{ item.title }}
                      v-list-item-subtitle {{ item.path }}
                    v-list-item-action
                      v-tooltip(left, v-if='statusFor(item)')
                        template(v-slot:activator='{ on }')
                          v-icon(v-on='on', :color='statusFor(item).color', small) {{ statusFor(item).icon }}
                        span {{ statusFor(item).label }}
                    v-list-item-action
                      v-icon(small) mdi-chevron-right
              v-card-text(v-else)
                .text-center.grey--text.py-5 This folder is empty.
</template>

<script>
export default {
  props: {
    locale: {
      type: String,
      default: 'en'
    },
    path: {
      type: String,
      default: ''
    },
    folderTitle: {
      type: String,
      default: ''
    },
    items: {
      type: String,
      default: ''
    },
    canWrite: {
      type: String,
      default: 'false'
    }
  },
  computed: {
    // ponytail: items arrives as base64 JSON from the server (like page.vue's sidebar)
    parsedItems () {
      if (!this.items) { return [] }
      try {
        return JSON.parse(Buffer.from(this.items, 'base64').toString('utf8'))
      } catch (err) {
        return []
      }
    },
    breadcrumbs () {
      const segments = this.path.split('/')
      let cur = `/${this.locale}`
      return [{ path: '/', name: 'Home' }].concat(segments.map(seg => {
        cur += `/${seg}`
        return { path: cur, name: seg }
      }))
    }
  },
  created () {
    // Seed page store so nav-header (search scope, home) has locale/path context
    this.$store.set('page/locale', this.locale)
    this.$store.set('page/path', this.path)

    // Listings carry page ids, so a rename shows up here too: recordVisit re-points
    // any tracked page at its current path (and is a no-op for untracked ones).
    this.parsedItems.forEach(item => {
      if (!item.isFolder && item.pageId) {
        this.$progress.recordVisit({
          pageId: item.pageId,
          locale: item.locale,
          path: item.path,
          title: item.title
        })
      }
    })
  },
  methods: {
    goHome () {
      window.location.assign('/')
    },
    /**
     * @param {Object} item Listing entry
     * @returns {Object|null} Status to show, or null when there is nothing to mark
     */
    statusFor (item) {
      if (item.isFolder || !item.pageId || !this.$progress.isEnabled) { return null }
      const status = this.$progress.getStatusByPageId(item.pageId)
      return status.showMarker ? status : null
    }
  }
}
</script>

<style lang="scss">

</style>
