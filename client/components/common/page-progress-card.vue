<template lang="pug">
  v-card.page-progress-card.mb-5(v-if='isEnabled')
    .pa-5
      .overline.pb-2.deep-purple--text(:class='$vuetify.theme.dark ? `text--lighten-3` : ``') {{ heading }}
      v-menu(offset-y, bottom, min-width='220')
        template(v-slot:activator='{ on: menu }')
          v-btn.text-none.px-3(
            v-on='menu'
            outlined
            block
            small
            :color='currentStatus.color'
            :aria-label='`Progress: ` + currentStatus.label'
            )
            v-icon(left, small) {{ currentStatus.icon }}
            span {{ currentStatus.label }}
            v-spacer
            v-icon(right, small) mdi-menu-down
        v-list(dense, nav)
          v-list-item(
            v-for='status of statuses'
            :key='status.id'
            @click='setStatus(status.id)'
            :input-value='status.id === currentStatus.id'
            )
            v-list-item-icon.mr-3
              v-icon(:color='status.color', small) {{ status.icon }}
            v-list-item-title {{ status.label }}
      .d-flex.align-center.mt-2
        v-btn.text-none.px-1(
          @click='dialogData = true'
          text
          x-small
          color='grey'
          )
          v-icon(left, x-small) mdi-database-cog-outline
          span Manage data
        v-spacer
        v-tooltip(bottom, v-if='!isPersistent')
          template(v-slot:activator='{ on }')
            v-icon(v-on='on', color='orange', x-small) mdi-alert-outline
          span Progress cannot be saved in this browser

    progress-data-dialog(v-model='dialogData')
</template>

<script>
import ProgressDataDialog from './progress-data-dialog.vue'

/**
 * Per-article progress selector.
 *
 * Presentation only: all state lives in `this.$progress` (ProgressManager), which is the
 * single source of truth and the only thing that knows about storage.
 */
export default {
  components: {
    ProgressDataDialog
  },
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
      default: ''
    },
    title: {
      type: String,
      default: ''
    },
    heading: {
      type: String,
      default: 'Progress'
    }
  },
  data () {
    return {
      dialogData: false
    }
  },
  computed: {
    isEnabled () {
      return this.$progress.isEnabled === true && this.pageId > 0
    },
    isPersistent () {
      return this.$progress.isPersistent
    },
    statuses () {
      return this.$progress.registry.list()
    },
    currentStatus () {
      // -> Reads the observable manager state, so this recomputes on every change,
      //    including writes made in another tab.
      return this.$progress.getStatusByPageId(this.pageId)
    }
  },
  methods: {
    setStatus (statusId) {
      this.$progress.setStatus(this.pageId, statusId, {
        locale: this.locale,
        path: this.path,
        title: this.title
      })
    }
  }
}
</script>
