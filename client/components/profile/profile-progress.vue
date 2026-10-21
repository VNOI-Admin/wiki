<template lang="pug">
  section.vn-pfp(v-if='$progress.isEnabled')
    .vn-pfp__head
      h2 {{ $t('common:progress.title', 'Tiến độ') }}
      a(href='/roadmaps') {{ $t('common:roadmap.listTitle', 'Lộ trình học') }} →
    //- One tile per status: a tile opens the list of its pages
    .vn-pfp__tiles(role='group', :aria-label='$t(`common:roadmap.byStatus`, `Bài theo tiến độ`)')
      button(
        v-for='s of statuses'
        :key='s.id'
        type='button'
        :aria-controls='listStatus ? `vn-pfp-list` : null'
        :aria-pressed='listStatus === s.id ? `true` : `false`'
        @click='listStatus = listStatus === s.id ? null : s.id'
        )
        b {{ byStatus(s.id).length }}
        span
          status-mark(:status='s')
          | {{ s.label }}
    ul.vn-pfp__list#vn-pfp-list(v-if='listStatus')
      li(v-for='r of byStatus(listStatus)', :key='r.pageId')
        a(:href='r.href') {{ r.title || r.path }}
        span {{ r.updatedAt | moment('L') }}
      li.vn-pfp__none(v-if='byStatus(listStatus).length < 1') {{ $t('common:roadmap.listEmpty', 'Chưa có bài nào.') }}
    .vn-pfp__data
      span {{ $progress.isAccountBacked ? $t('common:roadmap.backupAccount', 'Tiến độ đồng bộ theo tài khoản của bạn.') : $t('common:roadmap.backupLocal', 'Tiến độ lưu trên trình duyệt này. Xuất tệp để chuyển sang máy khác.') }}
      button.vn-btn.is-ghost(type='button', @click='dataDialog = true') {{ $t('common:progress.manageData', 'Quản lý dữ liệu') }}
    progress-data-dialog(v-model='dataDialog')
</template>

<script>
import _ from 'lodash'
import ProgressDataDialog from '../common/progress-data-dialog.vue'
import StatusMark from '../common/status-mark.vue'
import { recordHref } from '../../modules/progress/page-path'

export default {
  components: { ProgressDataDialog, StatusMark },
  data () {
    return {
      listStatus: null,
      dataDialog: false
    }
  },
  computed: {
    // -> Every status except the default one ("not started")
    statuses () {
      const defaultId = this.$progress.registry.getDefault().id
      return this.$progress.registry.list().filter(s => s.id !== defaultId)
    },
    records () {
      this.$progress.state.records // eslint-disable-line no-unused-expressions
      return this.$progress.listRecords()
        .map(r => ({ ...r, href: recordHref(r) }))
        .filter(r => r.pageId && r.href)
    },
    grouped () {
      return _.groupBy(this.records, 'statusId')
    }
  },
  methods: {
    byStatus (statusId) {
      return this.grouped[statusId] || []
    }
  }
}
</script>

<style lang="scss">
.vn-pfp {
  display: grid;
  gap: 14px;
  margin-bottom: 28px;
  color: var(--ink);
}

.vn-pfp__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 1.375rem;
    font-weight: 700;
  }

  a {
    color: var(--accent) !important;
  }
}

.vn-pfp__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 10px;

  button {
    display: grid;
    gap: 4px;
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    color: var(--muted);
    font: inherit;
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;

    &:hover {
      border-color: var(--accent);
    }

    &[aria-pressed='true'] {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    > span {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
  }

  b {
    font: 600 1.5rem/1.1 var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--ink);
  }
}

// -> The list scrolls inside its box
.vn-pfp__list {
  max-height: 22rem;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);

  li {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 14px;
    padding: 11px 16px;

    & + li {
      border-top: 1px solid var(--line);
    }
  }

  a {
    min-width: 0;
    color: var(--ink) !important;
    font-weight: 500;
  }

  span {
    flex: none;
    font: 500 0.8125rem var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
}

.vn-pfp__none {
  color: var(--muted);
}

.vn-pfp__data {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  font-size: 0.875rem;
  color: var(--muted);
}
</style>
