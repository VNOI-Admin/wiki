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
        :status='nodeStatus(node)'
        class='mb-2'
      )
    .pa-4.text-center.grey--text(v-else)
      v-icon(color='grey lighten-1') mdi-text-box-outline
      div.mt-1 No modules in this section yet.
</template>

<script>
import RoadmapNodeCard from './roadmap-node-card.vue'

export default {
  components: { RoadmapNodeCard },
  props: {
    section: { type: Object, required: true },
    nodeStatus: { type: Function, required: true }
  },
  computed: {
    sectionTotal () {
      return this.section.nodes.length
    },
    sectionCompleted () {
      return this.section.nodes.filter(n => {
        const s = this.nodeStatus(n)
        return s.id === 'completed'
      }).length
    }
  }
}
</script>
