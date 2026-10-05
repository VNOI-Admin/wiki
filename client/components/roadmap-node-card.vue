<template lang="pug">
  component.roadmap-node-card(
    :is='href ? "a" : "div"'
    :href='href'
    :target='isExternal ? "_blank" : undefined'
    :rel='isExternal ? "noopener noreferrer" : undefined'
    :class='{"is-placeholder": !href}'
    @click='onOpen'
    @auxclick='onOpen'
  )
    .node-difficulty
      v-rating(
        :value='node.difficulty'
        half-increments
        readonly
        dense
        small
        color='amber darken-1'
        background-color='grey lighten-1'
        :length='5'
      )
    .node-body
      .node-title {{ node.title }}
      .node-description(v-if='node.description') {{ node.description }}
    .node-status
      v-menu(v-if='href && canSetStatus' offset-y left)
        template(v-slot:activator='{ on }')
          //- .prevent: the card itself is a link, the chip must only open the menu
          v-chip(
            v-on='on'
            @click.native.prevent
            small
            :color='status.color'
            dark
            pill
          )
            v-icon(left, x-small) {{ status.icon }}
            | {{ status.label }}
            v-icon(right, x-small) mdi-menu-down
        v-list(dense)
          v-list-item(
            v-for='s in allStatuses'
            :key='s.id'
            @click='setStatus(s.id)'
          )
            v-list-item-avatar(size='20')
              v-icon(small, :color='s.color') {{ s.icon }}
            v-list-item-title {{ s.label }}
            v-list-item-action.my-0(v-if='s.id === status.id')
              v-icon(small, color='primary') mdi-check
      v-chip(
        v-else-if='!href'
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
        :color='status.color'
        dark
        pill
      )
        v-icon(left, x-small) {{ status.icon }}
        | {{ status.label }}
</template>

<script>
import { touchRoadmap } from '../modules/roadmap-context'

export default {
  props: {
    node: { type: Object, required: true },
    roadmapId: { type: String, default: '' },
    status: { type: Object, required: true }
  },
  computed: {
    isExternal () {
      return !this.node.articlePath && !!this.node.externalUrl
    },
    href () {
      if (this.node.articlePath) return '/' + this.node.articlePath
      if (this.node.externalUrl) return this.node.externalUrl
      return null
    },
    articleLocation () {
      if (!this.node.articlePath) return null
      const slash = this.node.articlePath.indexOf('/')
      if (slash < 0) return null
      return { locale: this.node.articlePath.slice(0, slash), path: this.node.articlePath.slice(slash + 1) }
    },
    pageId () {
      if (!this.articleLocation) return null
      // -> Resolved by the server; the alias index covers pages created since
      return this.node.pageId || this.$progress.getPageIdByPath(this.articleLocation.locale, this.articleLocation.path)
    },
    canSetStatus () {
      if (!this.$progress.isEnabled) return false
      // -> External links have no page, so their progress is tracked per roadmap node
      return !!this.pageId || (this.isExternal && !!this.roadmapId)
    },
    allStatuses () {
      return this.$progress.registry.list()
    }
  },
  methods: {
    onOpen () {
      // -> Another tab may have used a different roadmap since this one loaded
      if (this.node.articlePath) { touchRoadmap(this.roadmapId) }
    },
    setStatus (statusId) {
      if (this.pageId) {
        this.$progress.setStatus(this.pageId, statusId, {
          ...this.articleLocation,
          title: this.node.pageTitle || this.node.title
        })
      } else if (this.isExternal && this.roadmapId) {
        this.$progress.setNodeStatus(this.roadmapId, this.node.id, statusId, {
          title: this.node.title,
          url: this.node.externalUrl
        })
      }
    }
  }
}
</script>

<style lang="scss">
.roadmap-node-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;

  &[href]:hover {
    border-color: var(--v-primary-base);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  &.is-placeholder {
    opacity: 0.55;
    cursor: default;
  }

  .v-application.theme--dark & {
    border-color: rgba(255,255,255,0.12);
  }

  .node-difficulty {
    flex-shrink: 0;
    padding-top: 2px;
  }

  .node-body {
    flex: 1;
    min-width: 0;

    .node-title {
      font-weight: 600;
      font-size: 0.95rem;
      line-height: 1.3;
    }

    .node-description {
      font-size: 0.82rem;
      color: rgba(0,0,0,0.6);
      margin-top: 2px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;

      .v-application.theme--dark & {
        color: rgba(255,255,255,0.6);
      }
    }
  }

  .node-status {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding-top: 2px;
  }
}
</style>
