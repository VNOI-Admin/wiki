<template lang="pug">
  v-app(:dark='$vuetify.theme.dark')
    nav-header
    v-main
      .vn-wrap.vn-rmp
        //- TITLE AND VIEW OPTIONS
        header.vn-rmp__head
          div
            h1 {{ rm.title }}
            p(v-if='rm.description') {{ rm.description }}
          .vn-rmp__tools(v-if='rm.sections.length > 0')
            button.vn-chip(type='button', @click='toggleAll') {{ allOpen ? $t('common:roadmap.collapseAll', 'Thu gọn') : $t('common:roadmap.expandAll', 'Mở tất cả') }}
            button.vn-chip(
              v-if='progressOn'
              type='button'
              :aria-pressed='hideDone ? `true` : `false`'
              @click='setHideDone(!hideDone)'
              ) {{ $t('common:roadmap.hideDone', 'Ẩn bài hoàn thành') }}

        //- SUMMARY: done count, status chips, next article
        section.vn-rmp__sum(v-if='stats.total > 0')
          .vn-rmp__count
            b {{ stats.completed }}
            span {{ doneOfLabel }}
          .vn-rmp__bar(aria-hidden='true')
            i(:style='{ width: stats.percent + `%` }')
          .vn-rmp__chips(v-if='progressOn', role='group', :aria-label='$t(`common:roadmap.byStatus`, `Bài theo tiến độ`)')
            button.vn-chip(
              v-for='s of trackedStatuses'
              :key='s.id'
              type='button'
              aria-controls='vn-rmp-list'
              :aria-pressed='listStatus === s.id ? `true` : `false`'
              @click='listStatus = listStatus === s.id ? null : s.id'
              )
              status-mark(:status='s')
              span {{ s.label }}
              b {{ byStatus(s.id).length }}
          a.vn-rmp__next(
            v-if='nextItem'
            :href='nodeHref(nextItem.node)'
            :target='isExternal(nextItem.node) ? `_blank` : null'
            :rel='isExternal(nextItem.node) ? `noopener` : null'
            @click='onOpen(nextItem.node)'
            )
            span.vn-rmp__nextk {{ stats.completed > 0 ? $t('common:roadmap.continue', 'Học tiếp') : $t('common:roadmap.start', 'Bắt đầu') }}
            b {{ nextItem.node.title }}
            span.vn-rmp__nexts {{ nextStageLabel }} · {{ nextItem.section.title }}
            span.vn-rmp__arr(aria-hidden='true') →

        //- ARTICLES OF ONE STATUS (opened from a chip)
        ul.vn-rmp__list#vn-rmp-list(v-if='listStatus')
          li.vn-rmp__row(v-for='it of byStatus(listStatus)', :key='it.node.id')
            status-mark(:status='statusOf(it.node)')
            .vn-rmp__rowt
              a(:href='nodeHref(it.node)', :target='isExternal(it.node) ? `_blank` : null', @click='onOpen(it.node)') {{ it.node.title }}
              span {{ it.section.title }}
            v-menu(v-if='canSet(it.node)', offset-y, bottom, left, content-class='vn-menu')
              template(v-slot:activator='{ on, attrs }')
                button.vn-chip(type='button', v-bind='attrs', v-on='on', :aria-label='$t(`common:progress.statusAria`, { defaultValue: `Progress: {{status}}`, status: statusOf(it.node).label })')
                  span {{ statusOf(it.node).label }}
                  v-icon(small) mdi-chevron-down
              .vn-menu__list(role='menu')
                button.vn-menu__item(
                  v-for='s of allStatuses'
                  :key='s.id'
                  type='button'
                  role='menuitemradio'
                  :aria-checked='s.id === statusOf(it.node).id ? `true` : `false`'
                  @click='setStatus(it.node, s.id)'
                  )
                  status-mark(:status='s')
                  span {{ s.label }}
          li.vn-rmp__none(v-if='byStatus(listStatus).length < 1') {{ $t('common:roadmap.listEmpty', 'Chưa có bài nào.') }}

        //- STAGES: one row per section, opens to its articles
        ol.vn-rmp__stages(v-if='rm.sections.length > 0')
          li.vn-stage(
            v-for='st of visibleSections'
            :key='st.section.id'
            :class='{ "is-open": open[st.section.id], "is-done": sectionDone(st.section), "is-cur": nextItem && nextItem.section.id === st.section.id }'
            )
            button.vn-stage__h(type='button', :aria-expanded='open[st.section.id] ? `true` : `false`', @click='toggle(st.section.id)')
              span.vn-stage__badge {{ sectionDone(st.section) ? '✓' : st.si + 1 }}
              span.vn-stage__t {{ st.section.title }}
              span.vn-stage__mini(aria-hidden='true')
                i(:style='{ width: sectionStats(st.section).percent + `%` }')
              span.vn-stage__c {{ sectionStats(st.section).total ? sectionStats(st.section).completed + '/' + sectionStats(st.section).total : '–' }}
              span.vn-stage__chev(aria-hidden='true')
            ul.vn-stage__items(v-if='open[st.section.id]')
              li.vn-item(
                v-for='node of visibleNodes(st.section)'
                :key='node.id'
                :class='{ "is-done": isDone(node), "is-soon": !nodeHref(node) }'
                )
                button.vn-item__tick(
                  v-if='canSet(node)'
                  type='button'
                  :aria-pressed='isDone(node) ? `true` : `false`'
                  :aria-label='$t(`common:roadmap.markDone`, `Đánh dấu hoàn thành`) + `: ` + node.title'
                  :title='isDone(node) ? $t(`common:roadmap.unmarkDone`, `Bỏ đánh dấu hoàn thành`) : $t(`common:roadmap.markDone`, `Đánh dấu hoàn thành`)'
                  @click='toggleDone(node)'
                  )
                  status-mark(:status='statusOf(node)')
                span.vn-item__tick(v-else)
                  span.vn-pdot(:class='nodeHref(node) ? `s-` + statusOf(node).id : `is-soon`')
                .vn-item__body
                  a.vn-item__t(
                    v-if='nodeHref(node)'
                    :href='nodeHref(node)'
                    :target='isExternal(node) ? `_blank` : null'
                    :rel='isExternal(node) ? `noopener` : null'
                    :class='{ "is-ext": isExternal(node) }'
                    @click='onOpen(node)'
                    ) {{ node.title }}
                  span.vn-item__t(v-else) {{ node.title }}
                  span.vn-item__d(v-if='node.description') {{ node.description }}
                em.vn-item__soon(v-if='!nodeHref(node)') {{ $t('common:roadmap.noArticle', 'Chưa có bài') }}
                vn-stars(v-else-if='node.difficulty', :value='node.difficulty')
        p.vn-rmp__none(v-else) {{ $t('common:roadmap.empty', 'Chưa có phần học nào.') }}

        //- BACKUP
        section.vn-rmp__backup(v-if='progressOn')
          div
            h2 {{ $t('common:roadmap.backup', 'Sao lưu') }}
            p {{ $progress.isAccountBacked ? $t('common:roadmap.backupAccount', 'Tiến độ đồng bộ theo tài khoản của bạn.') : $t('common:roadmap.backupLocal', 'Tiến độ lưu trên trình duyệt này. Xuất tệp để chuyển sang máy khác.') }}
          button.vn-btn.is-ghost(type='button', @click='dataDialog = true') {{ $t('common:progress.manageData', 'Quản lý dữ liệu') }}
          progress-data-dialog(v-model='dataDialog')
    nav-footer
    search-results
</template>

<script>
import _ from 'lodash'
import ProgressDataDialog from './common/progress-data-dialog.vue'
import StatusMark from './common/status-mark.vue'
import VnStars from './common/vn-stars.vue'
import {
  CLOSED_STATUSES,
  DONE_STATUS,
  canSetNodeStatus,
  getNodeStatus,
  isExternalNode,
  nodeHref,
  nodeStats,
  setNodeStatus,
  touchRoadmap
} from '../modules/roadmap-context'

// -> The reader's choice to hide finished sections and articles, for every roadmap
const HIDE_DONE_KEY = 'vnRoadmapHideDone'

export default {
  components: { ProgressDataDialog, StatusMark, VnStars },
  props: {
    roadmap: {
      type: String,
      default: ''
    }
  },
  data () {
    let hideDone = false
    try {
      hideDone = window.localStorage.getItem(HIDE_DONE_KEY) === 'true'
    } catch (err) {}
    return {
      open: {},
      hideDone,
      listStatus: null,
      dataDialog: false
    }
  },
  computed: {
    rm () {
      try {
        const rm = JSON.parse(Buffer.from(this.roadmap, 'base64').toString('utf8'))
        return { title: '', description: '', ...rm, sections: rm.sections || [] }
      } catch (e) {
        return { title: '', description: '', sections: [] }
      }
    },
    progressOn () {
      return this.$progress.isEnabled
    },
    // -> Read in each status computation, so a status change re-renders every count
    records () {
      return this.$progress.state.records
    },
    items () {
      return _.flatMap(this.rm.sections, (section, si) => section.nodes.map(node => ({ node, section, si })))
    },
    stats () {
      this.records // eslint-disable-line no-unused-expressions
      return nodeStats(this.$progress, this.rm.id, _.map(this.items, 'node'))
    },
    allStatuses () {
      return this.$progress.registry.list()
    },
    trackedStatuses () {
      const defaultId = this.$progress.registry.getDefault().id
      return this.allStatuses.filter(s => s.id !== defaultId)
    },
    nextItem () {
      this.records // eslint-disable-line no-unused-expressions
      return _.find(this.items, it => nodeHref(it.node) && !CLOSED_STATUSES.includes(this.statusOf(it.node).id)) || null
    },
    // -> Labels with a {{placeholder}} default cannot sit inside a template interpolation
    doneOfLabel () {
      return this.$t('common:roadmap.doneOf', { defaultValue: '/ {{total}} bài hoàn thành', total: this.stats.total })
    },
    nextStageLabel () {
      return this.nextItem ? this.$t('common:roadmap.stage', { defaultValue: 'Chặng {{n}}', n: this.nextItem.si + 1 }) : ''
    },
    visibleSections () {
      return this.rm.sections
        .map((section, si) => ({ section, si }))
        .filter(st => !(this.hideDone && this.sectionDone(st.section)))
    },
    allOpen () {
      return this.rm.sections.every(s => this.open[s.id])
    }
  },
  created () {
    touchRoadmap(this.rm.id)
    // -> Open the section of the next article, or the first one
    const first = this.nextItem ? this.nextItem.section : this.rm.sections[0]
    if (first) { this.$set(this.open, first.id, true) }
  },
  methods: {
    isExternal (node) {
      return isExternalNode(node)
    },
    nodeHref (node) {
      return nodeHref(node)
    },
    statusOf (node) {
      this.records // eslint-disable-line no-unused-expressions
      return getNodeStatus(this.$progress, this.rm.id, node)
    },
    isDone (node) {
      return !!nodeHref(node) && this.statusOf(node).id === DONE_STATUS
    },
    canSet (node) {
      return canSetNodeStatus(this.$progress, this.rm.id, node)
    },
    setStatus (node, statusId) {
      setNodeStatus(this.$progress, this.rm.id, node, statusId)
    },
    toggleDone (node) {
      this.setStatus(node, this.isDone(node) ? this.$progress.registry.getDefault().id : DONE_STATUS)
    },
    sectionStats (section) {
      this.records // eslint-disable-line no-unused-expressions
      return nodeStats(this.$progress, this.rm.id, section.nodes)
    },
    sectionDone (section) {
      const st = this.sectionStats(section)
      return st.total > 0 && st.completed === st.total
    },
    visibleNodes (section) {
      return this.hideDone ? section.nodes.filter(n => !this.isDone(n)) : section.nodes
    },
    byStatus (statusId) {
      return this.items.filter(it => nodeHref(it.node) && this.statusOf(it.node).id === statusId)
    },
    toggle (id) {
      this.$set(this.open, id, !this.open[id])
    },
    toggleAll () {
      const value = !this.allOpen
      this.rm.sections.forEach(s => this.$set(this.open, s.id, value))
    },
    setHideDone (value) {
      this.hideDone = value
      try {
        window.localStorage.setItem(HIDE_DONE_KEY, String(value))
      } catch (err) {}
    },
    onOpen (node) {
      // -> The article page shows this roadmap in its rail
      if (node.articlePath) { touchRoadmap(this.rm.id) }
    }
  }
}
</script>

<style lang="scss">
.vn-rmp {
  padding-block: 40px 56px;
  color: var(--ink);
}

.vn-rmp__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 24px;

  h1 {
    margin: 0;
    font-size: clamp(1.8rem, 3.6vw, 2.4rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  p {
    margin: 8px 0 0 !important;
    max-width: 44rem;
    color: var(--muted);
  }
}

.vn-rmp__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

// ---------------------------------
// SUMMARY
// ---------------------------------

.vn-rmp__sum {
  margin-top: 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 24rem);
  align-items: center;
  gap: 12px 32px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.vn-rmp__count {
  align-self: end;
  color: var(--muted);
  font-size: 0.9375rem;

  b {
    margin-right: 6px;
    font: 600 1.5rem var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--ink);
  }
}

.vn-rmp__bar {
  grid-column: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--sunken);
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--done);
    transition: width 0.4s ease;
  }
}

.vn-rmp__chips {
  grid-column: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vn-rmp__next {
  grid-column: 2;
  grid-row: 1 / 4;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--ink) !important;
  text-decoration: none !important;

  &:hover {
    box-shadow: inset 0 0 0 1px var(--accent);
  }

  b {
    font-weight: 600;
  }
}

.vn-rmp__nextk {
  font: 600 0.75rem var(--font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

.vn-rmp__nexts {
  font-size: 0.8125rem;
  color: var(--muted);
}

.vn-rmp__arr {
  grid-column: 2;
  grid-row: 1 / 4;
  font-size: 1.25rem;
  color: var(--accent);
}

// ---------------------------------
// STATUS LIST
// ---------------------------------

.vn-rmp__list {
  list-style: none;
  margin: 16px 0 0 !important;
  padding: 0 !important;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.vn-rmp__row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;

  & + & {
    border-top: 1px solid var(--line);
  }
}

.vn-rmp__rowt {
  display: grid;
  gap: 2px;
  min-width: 0;

  a {
    color: var(--ink) !important;
    font-weight: 500;
    text-decoration: none !important;

    &:hover {
      color: var(--accent) !important;
    }
  }

  span {
    font-size: 0.8125rem;
    color: var(--muted);
  }
}

.vn-rmp__none {
  padding: 18px 16px;
  color: var(--muted);
}

// ---------------------------------
// STAGES
// ---------------------------------

.vn-rmp__stages {
  list-style: none;
  margin: 16px 0 0 !important;
  padding: 0 !important;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  overflow: hidden;
}

.vn-stage + .vn-stage {
  border-top: 1px solid var(--line);
}

.vn-rmp .vn-stage__h {
  width: 100%;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 6rem 3rem 12px;
  align-items: center;
  gap: 14px;
  padding: 12px 20px 12px 16px;
  color: var(--ink);

  &:hover {
    background: var(--sunken);
  }
}

.vn-stage__badge {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--line);
  border-radius: 50%;
  background: var(--surface);
  font: 600 0.8125rem var(--font-mono);
  color: var(--muted);

  .is-cur & {
    border-color: var(--accent);
    color: var(--accent);
  }

  .is-done & {
    border-color: var(--done);
    background: var(--done);
    color: var(--surface);
  }
}

.vn-stage__t {
  font-weight: 600;
  line-height: 1.35;
}

.vn-stage__mini {
  height: 6px;
  border-radius: 3px;
  background: var(--sunken);
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    background: var(--done);
  }
}

.vn-stage__c {
  text-align: right;
  font: 500 0.8125rem var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}

.vn-stage__chev {
  width: 8px;
  height: 8px;
  border-right: 1.5px solid var(--muted);
  border-bottom: 1.5px solid var(--muted);
  transform: rotate(-45deg);
  transition: transform 0.15s;

  .is-open & {
    transform: rotate(45deg);
  }
}

.vn-stage__items {
  list-style: none;
  margin: 0 !important;
  padding: 0 20px 14px 18px !important;
}

.vn-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 44px;
  padding: 4px 8px 4px 0;
  border-radius: 8px;

  &:hover {
    background: var(--sunken);
  }
}

.vn-item__tick {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;

  .vn-pdot.is-soon {
    border-style: dashed;
    opacity: 0.6;
  }
}

button.vn-item__tick:hover .vn-pdot {
  border-color: var(--done);
}

.vn-item__body {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.vn-item__t {
  color: var(--ink) !important;
  font-size: 0.9375rem;
  line-height: 1.4;
  text-decoration: none !important;

  .is-done &,
  .is-soon & {
    color: var(--muted) !important;
  }
}

a.vn-item__t:hover {
  color: var(--accent) !important;
}

.vn-item__d {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
  color: var(--muted);
}

.vn-item__soon {
  padding: 1px 5px;
  border: 1px solid var(--line);
  border-radius: 4px;
  font: 500 0.75rem var(--font-mono);
  font-style: normal;
  white-space: nowrap;
  color: var(--muted);
}

// ---------------------------------
// BACKUP
// ---------------------------------

.vn-rmp__backup {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 24px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);

  h2 {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 700;
  }

  p {
    margin: 4px 0 0 !important;
    font-size: 0.9375rem;
    color: var(--muted);
  }
}

@media (max-width: 760px) {
  .vn-rmp {
    padding-top: 24px;
  }
  .vn-rmp__sum {
    grid-template-columns: minmax(0, 1fr);
  }
  .vn-rmp__next {
    grid-column: 1;
    grid-row: auto;
  }
  .vn-rmp .vn-stage__h {
    grid-template-columns: 28px minmax(0, 1fr) auto 12px;
    gap: 12px;
    padding-inline: 16px;
  }
  .vn-stage__badge {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
  .vn-stage__mini {
    display: none;
  }
  .vn-stage__items {
    padding-inline: 12px !important;
  }
  .vn-item {
    gap: 10px;
  }
  .vn-item__d {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}
</style>
