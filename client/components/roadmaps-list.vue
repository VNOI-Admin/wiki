<template lang="pug">
  v-app(:dark='$vuetify.theme.dark')
    nav-header
    v-main
      v-container(fluid)
        v-row(justify='center')
          v-col(cols='12', lg='9', xl='7')
            .roadmaps-header.mb-6
              h1.headline Learning Roadmaps
              p.body-2.grey--text Structured learning paths to guide your study of algorithms and data structures.
            v-row
              v-col(
                v-for='roadmap in parsedRoadmaps'
                :key='roadmap.id'
                cols='12'
                sm='6'
                lg='4'
              )
                v-card.roadmap-card(
                  :href='"/roadmap/" + roadmap.id'
                  hover
                  outlined
                  height='100%'
                )
                  v-card-text
                    .roadmap-card-icon.mb-3
                      v-icon(large, color='primary') mdi-map-marker-path
                    .subtitle-1.font-weight-bold.mb-1 {{ roadmap.title }}
                    .body-2.grey--text.mb-3(style='-webkit-line-clamp:3; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;') {{ roadmap.description }}
                    v-chip(x-small, outlined, color='primary')
                      v-icon(left, x-small) mdi-book-open-outline
                      | {{ roadmap.nodeCount }} modules
            .text-center.py-12(v-if='parsedRoadmaps.length === 0')
              v-icon(x-large, color='grey lighten-1') mdi-map-marker-path
              div.mt-2.grey--text No roadmaps available yet.
    nav-footer
</template>

<script>
export default {
  props: {
    roadmaps: { type: String, default: '' }
  },
  computed: {
    parsedRoadmaps () {
      try {
        return JSON.parse(Buffer.from(this.roadmaps, 'base64').toString('utf8'))
      } catch (e) {
        return []
      }
    }
  }
}
</script>

<style lang="scss">
.roadmap-card {
  text-decoration: none;
  color: inherit;
  display: block;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--v-primary-base) !important;
  }
}
</style>
