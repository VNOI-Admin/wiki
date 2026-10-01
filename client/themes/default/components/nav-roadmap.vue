<template lang="pug">
  .nav-roadmap
    .nav-roadmap-header.pa-3
      .d-flex
        v-btn(
          depressed
          :color='btnColor'
          style='min-width:0;'
          @click='goHome'
          :aria-label='$t(`common:header.home`)'
          )
          v-icon(size='20') mdi-home
        v-btn.ml-3(
          v-if='canShowMenu'
          depressed
          :color='btnColor'
          style='flex: 1 1 100%;'
          @click='$emit(`show-menu`)'
          )
          v-icon(left) mdi-navigation
          .body-2.text-none {{$t('common:sidebar.mainMenu')}}
        v-spacer(v-else)
        v-btn.ml-3(
          depressed
          :color='btnColor'
          style='min-width:0;'
          :href='`/roadmap/` + roadmap.id'
          :title='$t(`common:roadmap.viewFull`, `View full roadmap`)'
          :aria-label='$t(`common:roadmap.viewFull`, `View full roadmap`)'
          )
          v-icon(size='20') mdi-map-marker-path
      v-menu(v-if='roadmaps.length > 1', offset-y, bottom)
        template(v-slot:activator='{ on }')
          button.nav-roadmap-title.is-switchable(
            v-on='on'
            type='button'
            :title='$t(`common:roadmap.switch`, `Switch roadmap`)'
            )
            span {{ roadmap.title }}
            v-icon(small) mdi-chevron-down
        v-list(dense)
          v-list-item(
            v-for='r of roadmaps'
            :key='r.id'
            @click='$emit(`select`, r)'
            )
            v-list-item-title {{ r.title }}
            v-list-item-action.my-0(v-if='r.id === roadmap.id')
              v-icon(small, color='primary') mdi-check
      a.nav-roadmap-title(v-else, :href='`/roadmap/` + roadmap.id') {{ roadmap.title }}
      .nav-roadmap-stats
        v-progress-linear(
          :value='stats.percent'
          color='success'
          :background-color='$vuetify.theme.dark ? `grey darken-2` : `grey lighten-2`'
          rounded
          height='4'
        )
        .caption.mt-1 {{ statsLabel }}
    v-divider
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
          v-icon.nav-roadmap-node-icon(small, :color='nodeStatus(node).color', :title='nodeStatus(node).label') {{ nodeStatus(node).icon }}
          span.nav-roadmap-node-title {{ node.title }}
          v-icon.nav-roadmap-node-external(v-if='isExternal(node)', x-small) mdi-open-in-new
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
    }
  },
  data () {
    return {
      collapsed: {}
    }
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
  --nav-roadmap-muted: rgba(0, 0, 0, 0.6);
  --nav-roadmap-line: rgba(0, 0, 0, 0.15);
  --nav-roadmap-hover: rgba(0, 0, 0, 0.04);
  --nav-roadmap-header: #{mc('grey', '100')};
  --nav-roadmap-accent: #{mc('blue', '700')};

  .theme--dark & {
    --nav-roadmap-muted: rgba(255, 255, 255, 0.6);
    --nav-roadmap-line: rgba(255, 255, 255, 0.15);
    --nav-roadmap-hover: rgba(255, 255, 255, 0.05);
    --nav-roadmap-header: #{mc('grey', '900')};
    --nav-roadmap-accent: #{mc('blue', '300')};
  }

  button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    cursor: pointer;
    text-align: inherit;
  }

  &-header {
    background-color: var(--nav-roadmap-header);
  }

  &-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    margin-top: 12px;
    padding: 4px;
    border-radius: 4px;
    font-size: 1.05rem;
    font-weight: 600;
    text-align: center !important;
    text-decoration: none;
    color: inherit !important;

    &:hover {
      background-color: var(--nav-roadmap-hover);
    }
  }

  &-stats {
    margin-top: 8px;
    color: var(--nav-roadmap-muted);
    text-align: center;
  }

  &-section {
    border-bottom: 1px solid var(--nav-roadmap-line);
  }

  &-section-header {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 16px;
    font-weight: 600;
    font-size: 0.9rem;

    &:hover {
      background-color: var(--nav-roadmap-hover);
    }
  }

  &-section-title {
    flex: 1 1 auto;
    min-width: 0;
  }

  &-section-count {
    margin: 0 6px;
    color: var(--nav-roadmap-muted);
  }

  &-nodes {
    padding-bottom: 8px;
  }

  &-node {
    position: relative;
    display: flex;
    align-items: flex-start;
    padding: 6px 16px 6px 20px;
    font-size: 0.875rem;
    line-height: 20px;
    text-decoration: none;
    color: var(--nav-roadmap-muted) !important;

    // -> Timeline line between the status icons
    &::before, &::after {
      content: '';
      position: absolute;
      left: 27px;
      width: 2px;
      background-color: var(--nav-roadmap-line);
    }
    &::before {
      top: 0;
      height: 6px;
    }
    &::after {
      top: 28px;
      bottom: 0;
    }
    &:first-child::before, &:last-child::after {
      display: none;
    }

    &:hover {
      background-color: var(--nav-roadmap-hover);
    }

    &.is-current {
      color: var(--nav-roadmap-accent) !important;
      font-weight: 600;
      background-color: var(--nav-roadmap-hover);
      box-shadow: inset 3px 0 0 var(--nav-roadmap-accent);
    }

    &.is-placeholder {
      opacity: 0.55;
      cursor: default;

      &:hover {
        background-color: transparent;
      }
    }
  }

  &-node-icon {
    flex: 0 0 auto;
    margin: 2px 12px 0 0;
  }

  &-node-title {
    flex: 1 1 auto;
    min-width: 0;
  }

  &-node-external {
    margin: 4px 0 0 4px;
    color: inherit !important;
  }
}
</style>
