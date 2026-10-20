<template lang='pug'>
  v-app(:dark='$vuetify.theme.dark').source
    nav-header
    v-main.vn-tool
      header.vn-ptop
        i18next(v-if='versionId > 0', path='common:page.viewingSourceVersion', tag='h1')
          strong(place='date', :title='$options.filters.moment(versionDate, `LLL`)') {{versionDate | moment('lll')}}
          strong(place='path') /{{path}}
        i18next(v-else, path='common:page.viewingSource', tag='h1')
          strong(place='path') /{{path}}
        .vn-ptop__ids
          span {{$t('common:page.id', { id: pageId })}}
          span(v-if='versionId > 0') {{$t('common:page.versionId', { id: versionId })}}
        .vn-ptop__acts
          button.vn-btn.is-ghost(v-if='versionId > 0', type='button', @click='goHistory')
            v-icon(small) mdi-history
            span {{$t('common:header.history')}}
          button.vn-btn(type='button', @click='goLive') {{$t('common:page.returnNormalView')}}
      .vn-pbody
        pre.vn-source
          slot

    nav-footer
    notify
    search-results
</template>

<script>
export default {
  props: {
    pageId: {
      type: Number,
      default: 0
    },
    locale: {
      type: String,
      default: 'en'
    },
    path: {
      type: String,
      default: 'home'
    },
    versionId: {
      type: Number,
      default: 0
    },
    versionDate: {
      type: String,
      default: ''
    },
    effectivePermissions: {
      type: String,
      default: ''
    }
  },
  data() {
    return {}
  },
  created () {
    this.$store.commit('page/SET_ID', this.id)
    this.$store.commit('page/SET_LOCALE', this.locale)
    this.$store.commit('page/SET_PATH', this.path)

    this.$store.commit('page/SET_MODE', 'source')

    if (this.effectivePermissions) {
      this.$store.set('page/effectivePermissions', JSON.parse(Buffer.from(this.effectivePermissions, 'base64').toString()))
    }
  },
  methods: {
    goLive() {
      window.location.assign(`/${this.locale}/${this.path}`)
    },
    goHistory () {
      window.location.assign(`/h/${this.locale}/${this.path}`)
    }
  }
}
</script>

<style lang='scss'>
.vn-tool {
  background: var(--bg);
}

.vn-source {
  margin: 0;
  padding: 16px 20px;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--code-bg);
  color: var(--code-ink);
  font: 400 0.875rem/1.7 var(--font-mono);
  white-space: pre-wrap;
  overflow-wrap: anywhere;

  > code {
    padding: 0;
    box-shadow: none;
    background: transparent !important;
    color: inherit !important;
    font: inherit;

    &::before {
      display: none;
    }
  }
}
</style>
