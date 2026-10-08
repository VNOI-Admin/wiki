<template lang="pug">
  v-app(:dark='$vuetify.theme.dark')
    nav-header
    v-main
      v-container(fluid)
        v-row(justify='center')
          v-col(cols='12', md='10', lg='8', xl='6')
            nav-roadmap(
              :roadmap='parsedRoadmap'
              :roadmaps='[parsedRoadmap]'
              :can-show-menu='false'
              :full-page='true'
            )
            .text-center.py-8(v-if='parsedRoadmap.sections.length === 0')
              v-icon(x-large, color='grey lighten-1') mdi-map-marker-path
              div.mt-2.grey--text Chưa có phần học nào.
    nav-footer
</template>

<script>
import NavRoadmap from '../themes/default/components/nav-roadmap.vue'
import { touchRoadmap } from '../modules/roadmap-context'

export default {
  components: { NavRoadmap },
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
    }
  },
  created () {
    touchRoadmap(this.parsedRoadmap.id)
  }
}
</script>
