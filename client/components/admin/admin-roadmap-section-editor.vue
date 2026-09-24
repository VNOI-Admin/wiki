<template lang="pug">
  v-card.mb-3(outlined)
    v-toolbar(flat, dense, :color='$vuetify.theme.dark ? "grey darken-3" : "grey lighten-4"')
      v-icon.mr-2(style='cursor:grab; color: rgba(0,0,0,0.3)') mdi-drag-horizontal-variant
      v-text-field(
        v-model='section.title'
        placeholder='Section title'
        dense
        flat
        solo
        hide-details
        style='max-width: 400px'
      )
      v-spacer
      v-btn(icon, small, color='error', @click='$emit("remove")')
        v-icon(small) mdi-delete-outline
    v-card-text.pt-2.pb-1
      draggable(
        v-model='section.nodes'
        handle='.drag-handle'
        ghost-class='drag-ghost'
        @end='resequenceNodes'
      )
        admin-roadmap-node-editor(
          v-for='(node, idx) in section.nodes'
          :key='node.id'
          :node='node'
          @remove='removeNode(idx)'
        )
      v-btn(text, small, color='primary', @click='addNode')
        v-icon(left, small) mdi-plus
        | Add Node
</template>

<script>
import draggable from 'vuedraggable'
import { v4 as uuidv4 } from 'uuid'
import AdminRoadmapNodeEditor from './admin-roadmap-node-editor.vue'

export default {
  components: { draggable, AdminRoadmapNodeEditor },
  props: {
    section: { type: Object, required: true }
  },
  methods: {
    addNode () {
      this.section.nodes.push({
        id: uuidv4(),
        title: '',
        description: '',
        difficulty: 0,
        articlePath: '',
        externalUrl: '',
        sortOrder: this.section.nodes.length * 10
      })
    },
    removeNode (idx) {
      this.section.nodes.splice(idx, 1)
    },
    resequenceNodes () {
      this.section.nodes.forEach((n, i) => { n.sortOrder = i * 10 })
    }
  }
}
</script>

<style>
.drag-ghost { opacity: 0.4; }
</style>
