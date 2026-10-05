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
              div.mt-2.grey--text Chưa có phần học nào.
    nav-footer
</template>

<script>
import RoadmapStatsBar from './roadmap-stats-bar.vue'
import RoadmapSection from './roadmap-section.vue'
import { getNodeStatus, touchRoadmap } from '../modules/roadmap-context'

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
      return (node) => getNodeStatus(this.$progress, this.parsedRoadmap.id, node)
    },
    roadmapStats () {
      const counts = {}
      let total = 0
      for (const section of this.parsedRoadmap.sections) {
        for (const node of section.nodes) {
          total++
          const s = this.nodeStatus(node)
          counts[s.id] = (counts[s.id] || 0) + 1
        }
      }
      const statuses = this.$progress.registry.list()
      const defaultId = this.$progress.registry.getDefault().id
      const nonDefault = total - (counts[defaultId] || 0)
      return {
        statuses: statuses.map(s => ({ ...s, count: counts[s.id] || 0 })),
        total,
        percent: total ? Math.round(100 * nonDefault / total) : 0
      }
    }
  },
  created () {
    // -> Pages opened from here show this roadmap in their sidebar
    touchRoadmap(this.parsedRoadmap.id)
  }
}
</script>

<style lang="scss">
.roadmap-header {
  padding-top: 8px;
}
</style>
