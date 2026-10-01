<template lang="pug">
  v-app(:dark='$vuetify.theme.dark')
    nav-header
    v-main
      v-container(fluid)
        v-row(justify='center')
          v-col(cols='12', lg='9', xl='7')
            .roadmap-header.mb-4
              h1.headline {{ parsedRoadmap.title }}
              p.body-2.grey--text(v-if='parsedRoadmap.description') {{ parsedRoadmap.description }}
            roadmap-stats-bar(:stats='roadmapStats')
            roadmap-section(
              v-for='section in parsedRoadmap.sections'
              :key='section.id'
              :section='section'
              :roadmap-id='parsedRoadmap.id'
              :node-status='nodeStatus'
            )
            .text-center.py-8(v-if='parsedRoadmap.sections.length === 0')
              v-icon(x-large, color='grey lighten-1') mdi-map-marker-path
              div.mt-2.grey--text No sections yet.
    nav-footer
</template>

<script>
import RoadmapStatsBar from './roadmap-stats-bar.vue'
import RoadmapSection from './roadmap-section.vue'

export default {
  components: { RoadmapStatsBar, RoadmapSection },
  props: {
    roadmap: {
      type: String,
      default: ''
    }
  },
  computed: {
    parsedRoadmap () {
      try {
        return JSON.parse(Buffer.from(this.roadmap, 'base64').toString('utf8'))
      } catch (e) {
        return { title: '', description: '', sections: [] }
      }
    },
    // Returns a function — the reactive dependency on state.aliases + state.records
    // is tracked by Vue when the function is called during render, so computed
    // properties derived from nodeStatus() update automatically.
    nodeStatus () {
      // Touch observable state so Vue registers the dependency at the computed level
      const _aliases = this.$progress.state.aliases // eslint-disable-line no-unused-vars
      const _records = this.$progress.state.records // eslint-disable-line no-unused-vars
      return (node) => {
        if (node.articlePath) {
          // -> The server resolves pageId; fall back to the alias index for pages
          //    created after the roadmap was rendered
          let pageId = node.pageId || null
          if (!pageId) {
            const slash = node.articlePath.indexOf('/')
            if (slash > 0) {
              pageId = this.$progress.getPageIdByPath(node.articlePath.slice(0, slash), node.articlePath.slice(slash + 1))
            }
          }
          return pageId ? this.$progress.getStatusByPageId(pageId) : this.$progress.registry.getDefault()
        }
        if (node.externalUrl) {
          return this.$progress.getStatusByNode(this.parsedRoadmap.id, node.id)
        }
        return this.$progress.registry.getDefault()
      }
    },
    roadmapStats () {
      const c = { completed: 0, reading: 0, skipped: 0, notStarted: 0, total: 0 }
      for (const section of this.parsedRoadmap.sections) {
        for (const node of section.nodes) {
          c.total++
          const s = this.nodeStatus(node)
          // ponytail: hardcoded status IDs; generalise when admins need custom status→roadmap mapping
          if (s.id === 'completed') c.completed++
          else if (s.id === 'reading') c.reading++
          else if (s.id === 'skipped') c.skipped++
          else c.notStarted++
        }
      }
      c.percent = c.total ? Math.round(100 * c.completed / c.total) : 0
      return c
    }
  }
}
</script>

<style lang="scss">
.roadmap-header {
  padding-top: 8px;
}
</style>
