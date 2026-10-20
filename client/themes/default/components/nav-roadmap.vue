<template lang="pug">
  .nav-roadmap(:class='{ "is-full-page": fullPage }')
    .nav-roadmap-header
      template(v-if='!fullPage')
        .nav-roadmap-head
          v-menu(v-if='roadmaps.length > 1', offset-y, bottom, content-class='vn-menu')
            template(v-slot:activator='{ on }')
              button.nav-roadmap-title.is-switchable(
                v-on='on'
                type='button'
                :title='$t(`common:roadmap.switch`, `Đổi lộ trình`)'
                )
                span {{ roadmap.title }}
                v-icon(small) mdi-chevron-down
            .vn-menu__list
              button.vn-menu__item(
                v-for='r of roadmaps'
                :key='r.id'
                type='button'
                role='menuitemradio'
                :aria-checked='r.id === roadmap.id ? `true` : `false`'
                @click='$emit(`select`, r)'
                ) {{ r.title }}
          a.nav-roadmap-title(v-else, :href='`/roadmap/` + roadmap.id') {{ roadmap.title }}
          button.nav-roadmap-hide(
            v-if='canHide'
            type='button'
            @click='$emit(`hide`)'
            :title='$t(`common:roadmap.hide`, `Ẩn lộ trình`)'
            :aria-label='$t(`common:roadmap.hide`, `Ẩn lộ trình`)'
            ) ×
      template(v-else)
        .nav-roadmap-title {{ roadmap.title }}
        p.nav-roadmap-description(v-if='roadmap.description') {{ roadmap.description }}
      .nav-roadmap-stats
        .nav-roadmap-bar(aria-hidden='true')
          i(:style='{ width: stats.percent + `%` }')
        .nav-roadmap-count {{ statsLabel }}
    .nav-roadmap-section(
      v-for='section of roadmap.sections'
      :key='section.id'
      :class='{ "is-collapsed": collapsed[section.id] }'
      )
      button.nav-roadmap-section-header(type='button', @click='toggleSection(section.id)')
        span.nav-roadmap-section-title {{ section.title }}
        span.caption.nav-roadmap-section-count {{ sectionCompleted(section) }}/{{ section.nodes.length }}
        v-icon(small) {{ collapsed[section.id] ? 'mdi-chevron-right' : 'mdi-chevron-down' }}
      .nav-roadmap-nodes(v-if='!collapsed[section.id]')
        component.nav-roadmap-node(
          v-for='node of section.nodes'
          :key='node.id'
          :is='nodeHref(node) ? `a` : `div`'
          :href='nodeHref(node)'
          :target='isExternal(node) ? `_blank` : undefined'
          :rel='isExternal(node) ? `noopener noreferrer` : undefined'
          :class='{ "is-current": isCurrent(node), "is-placeholder": !nodeHref(node) }'
          @click='onOpen(node)'
          @auxclick='onOpen(node)'
          )
          span.vn-pdot.nav-roadmap-node-icon(v-if='hasDot(nodeStatus(node))', :class='`s-` + nodeStatus(node).id', :title='nodeStatus(node).label')
          v-icon.nav-roadmap-node-icon(v-else, small, :color='nodeStatus(node).color', :title='nodeStatus(node).label') {{ nodeStatus(node).icon }}
          .nav-roadmap-node-body
            span.nav-roadmap-node-title {{ node.title }}
            .nav-roadmap-node-meta(v-if='fullPage')
              v-rating(
                v-if='node.difficulty'
                :value='node.difficulty'
                half-increments
                readonly
                dense
                x-small
                color='amber darken-1'
                background-color='grey lighten-1'
                :length='5'
              )
              span.nav-roadmap-node-desc(v-if='node.description') {{ node.description }}
          .nav-roadmap-node-actions(v-if='fullPage')
            v-menu(v-if='nodeHref(node) && nodeCanSetStatus(node)', offset-y, left)
              template(v-slot:activator='{ on }')
                v-chip(
                  v-on='on'
                  @click.native.prevent
                  small
                  :color='nodeStatus(node).color'
                  dark
                  pill
                )
                  v-icon(left, x-small) {{ nodeStatus(node).icon }}
                  | {{ nodeStatus(node).label }}
                  v-icon(right, x-small) mdi-menu-down
              v-list(dense)
                v-list-item(
                  v-for='s in allStatuses'
                  :key='s.id'
                  @click='nodeSetStatus(node, s.id)'
                )
                  v-list-item-avatar(size='20')
                    v-icon(small, :color='s.color') {{ s.icon }}
                  v-list-item-title {{ s.label }}
                  v-list-item-action.my-0(v-if='s.id === nodeStatus(node).id')
                    v-icon(small, color='primary') mdi-check
            v-chip(
              v-else-if='!nodeHref(node)'
              small
              color='grey lighten-1'
              text-color='grey darken-1'
              pill
            )
              v-icon(left, x-small) mdi-pencil-off-outline
              | Chưa có bài
            v-chip(
              v-else
              small
              :color='nodeStatus(node).color'
              dark
              pill
            )
              v-icon(left, x-small) {{ nodeStatus(node).icon }}
              | {{ nodeStatus(node).label }}
          v-icon.nav-roadmap-node-external(v-if='isExternal(node) && !fullPage', x-small) mdi-open-in-new
</template>

<script>
import _ from 'lodash'
import { getNodeStatus, touchRoadmap } from '../../../modules/roadmap-context'

/* global siteLangs */

export default {
  props: {
    roadmap: {
      type: Object,
      required: true
    },
    // -> Every roadmap containing the current page, for the switcher
    roadmaps: {
      type: Array,
      default: () => []
    },
    locale: {
      type: String,
      default: 'en'
    },
    path: {
      type: String,
      default: ''
    },
    canShowMenu: {
      type: Boolean,
      default: true
    },
    fullPage: {
      type: Boolean,
      default: false
    },
    // -> Shows the × that hides the rail (not in the bottom sheet)
    canHide: {
      type: Boolean,
      default: true
    }
  },
  data () {
    const collapsed = {}
    if (this.fullPage) {
      for (const s of this.roadmap.sections) collapsed[s.id] = true
    }
    return { collapsed }
  },
  computed: {
    btnColor () {
      return this.$vuetify.theme.dark ? 'grey darken-4' : 'grey lighten-2'
    },
    currentArticlePath () {
      return `${this.locale}/${this.path}`
    },
    nodeStatus () {
      // -> Touch observable state so status changes re-render the sidebar
      const _aliases = this.$progress.state.aliases // eslint-disable-line no-unused-vars
      const _records = this.$progress.state.records // eslint-disable-line no-unused-vars
      return node => getNodeStatus(this.$progress, this.roadmap.id, node)
    },
    stats () {
      const nodes = _.flatMap(this.roadmap.sections, 'nodes')
      // ponytail: hardcoded status ID, same as the roadmap page
      const completed = nodes.filter(n => this.nodeStatus(n).id === 'completed').length
      return {
        completed,
        total: nodes.length,
        percent: nodes.length ? Math.round(100 * completed / nodes.length) : 0
      }
    },
    statsLabel () {
      return this.$t('common:roadmap.completed', {
        defaultValue: '{{completed}} / {{total}} completed',
        completed: this.stats.completed,
        total: this.stats.total
      })
    },
    allStatuses () {
      return this.$progress.registry.list()
    }
  },
  watch: {
    'roadmap.id' () {
      this.collapsed = {}
      this.$nextTick(this.scrollToCurrent)
    }
  },
  mounted () {
    this.$nextTick(this.scrollToCurrent)
  },
  methods: {
    // -> The four built-in statuses draw as dots; an admin-added status keeps its icon
    hasDot (status) {
      return ['none', 'reading', 'completed', 'skipped'].includes(status.id)
    },
    isExternal (node) {
      return !node.articlePath && !!node.externalUrl
    },
    isCurrent (node) {
      return node.articlePath === this.currentArticlePath
    },
    nodeHref (node) {
      if (node.articlePath) { return '/' + node.articlePath }
      return node.externalUrl || null
    },
    sectionCompleted (section) {
      return section.nodes.filter(n => this.nodeStatus(n).id === 'completed').length
    },
    nodeArticleLocation (node) {
      if (!node.articlePath) return null
      const slash = node.articlePath.indexOf('/')
      if (slash < 0) return null
      return { locale: node.articlePath.slice(0, slash), path: node.articlePath.slice(slash + 1) }
    },
    nodePageId (node) {
      const loc = this.nodeArticleLocation(node)
      if (!loc) return null
      return node.pageId || this.$progress.getPageIdByPath(loc.locale, loc.path)
    },
    nodeCanSetStatus (node) {
      if (!this.$progress.isEnabled) return false
      return !!this.nodePageId(node) || (this.isExternal(node) && !!this.roadmap.id)
    },
    nodeSetStatus (node, statusId) {
      const pageId = this.nodePageId(node)
      if (pageId) {
        this.$progress.setStatus(pageId, statusId, {
          ...this.nodeArticleLocation(node),
          title: node.pageTitle || node.title
        })
      } else if (this.isExternal(node) && this.roadmap.id) {
        this.$progress.setNodeStatus(this.roadmap.id, node.id, statusId, {
          title: node.title,
          url: node.externalUrl
        })
      }
    },
    toggleSection (id) {
      this.$set(this.collapsed, id, !this.collapsed[id])
    },
    onOpen (node) {
      // -> The next page shows this roadmap, even if another tab used a different one
      if (node.articlePath) { touchRoadmap(this.roadmap.id) }
    },
    scrollToCurrent () {
      const el = this.$el.querySelector('.nav-roadmap-node.is-current')
      if (!el) { return }
      // -> Scroll only the sidebar's own scroll panel: scrollIntoView() could also
      //    move the page and fight with anchor (#hash) scrolling
      let panel = el.parentElement
      while (panel && panel !== document.body) {
        const overflowY = window.getComputedStyle(panel).overflowY
        if ((overflowY === 'auto' || overflowY === 'scroll') && panel.scrollHeight > panel.clientHeight) { break }
        panel = panel.parentElement
      }
      if (!panel || panel === document.body) { return }
      const offset = el.getBoundingClientRect().top - panel.getBoundingClientRect().top
      panel.scrollTop += offset - panel.clientHeight / 3
    },
    goHome () {
      window.location.assign(siteLangs.length > 0 ? `/${this.locale}/home` : '/')
    }
  }
}
</script>

<style lang="scss">
.nav-roadmap {
  font-size: 0.875rem;
  color: var(--ink);

  button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    cursor: pointer;
    text-align: inherit;
  }

  &-header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: grid;
    gap: 8px;
    padding: 4px 0 14px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--line);
    background: var(--bg);
  }

  &-head {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  &-title {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.9375rem;
    font-weight: 700;
    line-height: 1.35;
    color: var(--ink) !important;
    text-decoration: none !important;

    &:hover {
      color: var(--accent) !important;
    }
  }

  &-hide {
    flex: none;
    width: 28px;
    height: 28px;
    margin-top: -4px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: var(--muted) !important;
    font-size: 1.125rem;

    &:hover {
      background: var(--sunken);
      color: var(--ink) !important;
    }
  }

  &-bar {
    height: 6px;
    border-radius: 3px;
    background: var(--sunken);
    overflow: hidden;

    i {
      display: block;
      height: 100%;
      background: var(--done);
      border-radius: 3px;
    }
  }

  &-count {
    font-size: 0.8125rem;
    color: var(--muted);
  }

  &-description {
    margin: 0 !important;
    color: var(--muted);
  }

  &-section {
    border-bottom: 1px solid var(--line);
  }

  &-section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 9px 2px;
    font-weight: 600;

    .v-icon {
      order: -1;
      color: var(--muted) !important;
    }
  }

  &-section-title {
    flex: 1 1 auto;
    min-width: 0;
  }

  &-section-count {
    flex: none;
    font: 500 0.75rem var(--font-mono);
    color: var(--muted);
  }

  &-nodes {
    display: grid;
    gap: 1px;
    padding-bottom: 8px;
  }

  &-node {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: start;
    padding: 5px 8px;
    border-radius: 8px;
    line-height: 1.4;
    color: var(--ink) !important;
    text-decoration: none !important;

    &:hover {
      background: var(--sunken);
    }

    &.is-current {
      background: var(--accent-soft);
      color: var(--accent) !important;
      font-weight: 600;
    }

    &.is-placeholder {
      color: var(--muted) !important;
      cursor: default;

      &:hover {
        background: none;
      }

      .vn-pdot {
        border-style: dashed;
      }
    }
  }

  &-node-icon {
    margin-top: 3px;
  }

  &-node-body {
    min-width: 0;
  }

  &-node-title {
    display: block;
  }

  &-node-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    flex-wrap: wrap;
  }

  &-node-desc {
    font-size: 0.8rem;
    color: var(--muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &-node-actions {
    display: flex;
    align-items: flex-start;
  }

  &-node-external {
    margin-top: 3px;
    color: var(--muted) !important;
  }

  &.is-full-page {
    .nav-roadmap-header {
      position: static;
      background: none;
    }

    .nav-roadmap-title {
      font-size: 1.4rem;
    }

    .nav-roadmap-section-header {
      font-size: 1rem;
      padding: 14px 4px;
    }

    .nav-roadmap-node {
      padding: 10px 12px;
      font-size: 0.95rem;
    }
  }
}
</style>
