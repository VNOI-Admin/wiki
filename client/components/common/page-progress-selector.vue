<template lang="pug">
  .page-progress(v-if='isEnabled')
    v-menu(offset-y, bottom, min-width='220', content-class='vn-menu')
      template(v-slot:activator='{ on: menu }')
        button.vn-pbtn(
          v-on='menu'
          type='button'
          :class='`s-` + currentStatus.id'
          :aria-label='$t(`common:progress.statusAria`, { defaultValue: `Progress: {{status}}`, status: currentStatus.label, interpolation: { escapeValue: false } })'
          )
          status-mark(:status='currentStatus')
          span.vn-pbtn__k {{ $t('common:progress.title', 'Tiến độ') }}:
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
          status-mark(:status='status')
          span {{ status.label }}
        hr
        a.vn-menu__item(:href='listHref') {{ $t('common:progress.viewAll', 'Xem tất cả bài theo tiến độ') }}
        .vn-menu__note(v-if='!isAccountBacked') {{ $t('common:progress.savedLocally', 'Log in to auto-sync your progress.') }}
        button.vn-menu__item(type='button', @click='dialogData = true')
          v-icon(small) mdi-database-cog-outline
          span {{ $t('common:progress.manageData', 'Quản lý dữ liệu') }}
          v-icon.ml-auto(v-if='!isPersistent', small, color='orange', :title='$t(`common:progress.notPersistent`, `Trình duyệt này không lưu được tiến độ`)') mdi-alert-outline

    progress-data-dialog(v-model='dialogData')
</template>

<script>
import ProgressDataDialog from './progress-data-dialog.vue'
import StatusMark from './status-mark.vue'
import { notifyStatus } from '../../modules/progress/notify-status'
import { READING_STATUS } from '../../modules/roadmap-context'

/**
 * Per-article progress selector, in the article meta row.
 *
 * Presentation only: all state lives in `this.$progress` (ProgressManager), which is the
 * single source of truth and the only thing that knows about storage.
 */
export default {
  components: {
    ProgressDataDialog,
    StatusMark
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
    },
    // -> The catalogue, filtered on this page's status ("Đang đọc" for a page not started)
    listHref () {
      const status = this.currentStatus.id === this.$progress.registry.getDefault().id ? READING_STATUS : this.currentStatus.id
      return `/${this.locale}/articles?p=${encodeURIComponent(status)}`
    }
  },
  methods: {
    setStatus (statusId) {
      if (statusId === this.currentStatus.id) { return }
      this.$progress.setStatus(this.pageId, statusId, {
        locale: this.locale,
        path: this.path,
        title: this.title
      })
      notifyStatus(this, this.$progress.registry.resolve(statusId))
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

  &__k {
    color: var(--muted);
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
