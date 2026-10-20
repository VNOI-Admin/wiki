<template lang="pug">
  .page-progress(v-if='isEnabled', :class='`is-` + variant')
    v-menu(offset-y, bottom, min-width='220', content-class='vn-menu')
      template(v-slot:activator='{ on: menu }')
        button.vn-pbtn(
          v-on='menu'
          type='button'
          :class='`s-` + currentStatus.id'
          :aria-label='$t(`common:progress.statusAria`, { defaultValue: `Progress: {{status}}`, status: currentStatus.label })'
          )
          span.vn-pdot(v-if='hasDot(currentStatus)', :class='`s-` + currentStatus.id')
          v-icon(v-else, small, :color='currentStatus.color') {{ currentStatus.icon }}
          b {{ currentStatus.label }}
      .vn-menu__list(role='menu')
        button.vn-menu__item(
          v-for='status of statuses'
          :key='status.id'
          type='button'
          role='menuitemradio'
          :aria-checked='status.id === currentStatus.id ? `true` : `false`'
          @click='setStatus(status.id)'
          )
          span.vn-pdot(v-if='hasDot(status)', :class='`s-` + status.id')
          v-icon(v-else, small, :color='status.color') {{ status.icon }}
          span {{ status.label }}
        hr
        .vn-menu__note(v-if='!isAccountBacked') {{ $t('common:progress.savedLocally', 'Log in to auto-sync your progress.') }}
        button.vn-menu__item(type='button', @click='dialogData = true')
          v-icon(small) mdi-database-cog-outline
          span {{ $t('common:progress.manageData', 'Quản lý dữ liệu') }}
          v-icon.ml-auto(v-if='!isPersistent', small, color='orange', :title='$t(`common:progress.notPersistent`, `Trình duyệt này không lưu được tiến độ`)') mdi-alert-outline

    progress-data-dialog(v-model='dialogData')
</template>

<script>
import ProgressDataDialog from './progress-data-dialog.vue'

/**
 * Per-article progress selector.
 *
 * Presentation only: all state lives in `this.$progress` (ProgressManager), which is the
 * single source of truth and the only thing that knows about storage.
 *
 * Rendered in three places on an article, hence the variants:
 *   card   sidebar column (hidden below the `lg` breakpoint)
 *   inline beside the page title, compact
 *   block  below the page content, with a prompt
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
    variant: {
      type: String,
      default: 'card',
      validator: v => ['card', 'inline', 'block'].includes(v)
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
    isAccountBacked () {
      return this.$progress.isAccountBacked === true
    },
    isPersistent () {
      // -> The account is the real store; the browser copy is only a cache
      return this.isAccountBacked || this.$progress.isPersistent
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
    // -> The four built-in statuses draw as dots; an admin-added status keeps its icon
    hasDot (status) {
      return ['none', 'reading', 'completed', 'skipped'].includes(status.id)
    },
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

<style lang="scss">
.vn-pbtn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: 0.875rem;

  &:hover {
    border-color: var(--accent);
  }

  b {
    font-weight: 600;
  }

  // -> Down chevron
  &::after {
    content: '';
    width: 6px;
    height: 6px;
    margin: -3px 2px 0 4px;
    border-right: 1.5px solid var(--muted);
    border-bottom: 1.5px solid var(--muted);
    transform: rotate(45deg);
  }

  &.s-completed {
    border-color: var(--done);
    background: var(--done-soft);
  }
}
</style>
