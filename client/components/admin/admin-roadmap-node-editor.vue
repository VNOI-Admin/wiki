<template lang="pug">
  v-card.mb-2(flat, outlined)
    v-card-text.pa-2
      .d-flex.align-center
        v-icon.drag-handle(style='cursor:grab; color: rgba(0,0,0,0.3)') mdi-drag-horizontal-variant
        v-btn(icon, x-small, @click='expanded = !expanded')
          v-icon(x-small) {{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
        .node-collapsed-title.ml-2.body-2.flex-grow-1 {{ node.title || '(untitled node)' }}
        v-rating.mr-2(
          v-if='!expanded'
          :value='node.difficulty'
          half-increments
          readonly
          dense
          x-small
          color='amber darken-1'
          background-color='grey lighten-1'
          :length='5'
        )
        v-btn(icon, x-small, color='error', @click='$emit("remove")')
          v-icon(x-small) mdi-delete-outline
      v-expand-transition
        div(v-show='expanded')
          v-divider.mt-2
          .node-form.pa-2
            v-text-field(
              v-model='node.title'
              label='Title'
              dense
              outlined
              hide-details='auto'
              class='mb-2'
            )
            v-textarea(
              v-model='node.description'
              label='Description'
              dense
              outlined
              hide-details='auto'
              rows='2'
              class='mb-2'
              auto-grow
            )
            .d-flex.align-center.mb-2
              .caption.mr-3 Difficulty
              v-rating(
                v-model='node.difficulty'
                half-increments
                dense
                small
                color='amber darken-1'
                background-color='grey lighten-1'
                :length='5'
                clearable
              )
              v-btn(v-if='node.difficulty > 0', icon, x-small, @click='node.difficulty = 0')
                v-icon(x-small) mdi-close
            v-text-field(
              v-model='node.articlePath'
              label='Article Path (e.g. en/algo/dp)'
              dense
              outlined
              hide-details='auto'
              class='mb-2'
              :error='articlePathError'
              :error-messages='articlePathError ? "Must start with locale prefix, e.g. en/algo/dp" : ""'
              clearable
            )
            v-text-field(
              v-model='node.externalUrl'
              label='External URL (https://...)'
              dense
              outlined
              hide-details='auto'
              :error='externalUrlError'
              :error-messages='externalUrlError ? "Must be a valid http/https URL" : ""'
              clearable
            )
</template>

<script>
export default {
  props: {
    node: { type: Object, required: true }
  },
  data () {
    return { expanded: false }
  },
  computed: {
    articlePathError () {
      if (!this.node.articlePath) return false
      return !/^[a-z]{2}\/.+/.test(this.node.articlePath)
    },
    externalUrlError () {
      if (!this.node.externalUrl) return false
      return !/^https?:\/\//.test(this.node.externalUrl)
    }
  }
}
</script>
