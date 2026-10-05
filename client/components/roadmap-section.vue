<template lang="pug">
  v-card.roadmap-section.mb-4(flat, outlined)
    v-toolbar(
      :color='$vuetify.theme.dark ? "grey darken-3" : "grey lighten-4"'
      flat
      dense
    )
      v-toolbar-title.subtitle-1.font-weight-bold {{ section.title }}
      v-spacer
      v-chip(small, outlined, :color='sectionCompleted === sectionTotal && sectionTotal > 0 ? "success" : "default"')
        v-icon(left, x-small) mdi-check-circle-outline
        | {{ sectionCompleted }} / {{ sectionTotal }}
    v-divider
    .section-nodes.pa-3(v-if='section.nodes.length > 0')
      roadmap-node-card(
        v-for='node in section.nodes'
        :key='node.id'
        :node='node'
        :roadmap-id='roadmapId'
        :status='nodeStatus(node)'
        class='mb-2'
      )
    .pa-4.text-center.grey--text(v-else)
      v-icon(color='grey lighten-1') mdi-text-box-outline
      div.mt-1 Chưa có bài học nào trong phần này.
</template>

<script>
import RoadmapNodeCard from './roadmap-node-card.vue'

export default {
  components: { RoadmapNodeCard },
  props: {
    section: { type: Object, required: true },
    roadmapId: { type: String, default: '' },
    nodeStatus: { type: Function, required: true }
  },
  computed: {
    sectionTotal () {
      return this.section.nodes.length
    },
    sectionCompleted () {
      const defaultId = this.$progress.registry.getDefault().id
      return this.section.nodes.filter(n => this.nodeStatus(n).id !== defaultId).length
    }
  }
}
</script>
