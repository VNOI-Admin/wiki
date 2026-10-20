<template lang="pug">
  v-app(:dark='$vuetify.theme.dark')
    nav-header
    v-main.vn-tool
      header.vn-ptop
        nav.vn-fcrumbs(:aria-label='$t(`common:page.breadcrumb`, `Đường dẫn`)')
          template(v-for='(crumb, idx) of breadcrumbs')
            span(v-if='idx > 0', aria-hidden='true') /
            a(:href='crumb.path', :key='crumb.path') {{ idx === 0 ? $t(`common:header.home`, `Trang chủ`) : crumb.name }}
        h1
          v-icon mdi-folder-open-outline
          span {{ folderTitle || path }}
        .vn-ptop__acts(v-if='canWrite === `true`')
          a.vn-btn.is-ghost(:href='`/e/` + locale + `/` + path')
            v-icon(small) mdi-plus
            span {{ $t('common:folder.createHere', 'Tạo trang ở đây') }}
      .vn-pbody
        ul.vn-flist(v-if='parsedItems.length > 0')
          li(v-for='item of parsedItems', :key='item.id')
            a(:href='`/` + item.locale + `/` + item.path')
              v-icon(:class='item.isFolder ? `is-folder` : ``') {{ item.isFolder ? `mdi-folder` : `mdi-text-box-outline` }}
              span.vn-flist__t
                b {{ item.title }}
                span {{ item.path }}
              v-icon(
                v-if='statusFor(item)'
                small
                :color='statusFor(item).color'
                :title='statusFor(item).label'
                :aria-label='statusFor(item).label'
                ) {{ statusFor(item).icon }}
              v-icon.vn-flist__chev(small) mdi-chevron-right
        .vn-fempty(v-else) {{ $t('common:folder.empty', 'Thư mục này trống.') }}
    search-results
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
.vn-fcrumbs {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--muted);

  a {
    color: var(--muted) !important;
  }
}

.vn-ptop h1 {
  display: inline-flex;
  align-items: center;
  gap: 10px;

  .v-icon {
    color: var(--muted) !important;
  }
}

.vn-flist {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  overflow: hidden;

  li + li {
    border-top: 1px solid var(--line);
  }

  a {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    color: var(--ink) !important;
    text-decoration: none !important;

    &:hover {
      background: var(--sunken);
    }
  }

  .v-icon {
    color: var(--muted);

    &.is-folder {
      color: var(--star) !important;
    }
  }
}

.vn-flist__t {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;

  b {
    font-weight: 600;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: 500 0.8125rem var(--font-mono);
    color: var(--muted);
  }
}

.vn-fempty {
  padding: 32px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  text-align: center;
  color: var(--muted);
}
</style>
