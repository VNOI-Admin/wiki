<template lang="pug">
  //- The built-in statuses have a dot (styled in tokens.scss); a status that an admin adds shows its icon
  span.vn-pdot(v-if='hasDot', :class='`s-` + status.id')
  v-icon(v-else, small, :color='status.color') {{ status.icon }}
</template>

<script>
const DOT_STATUSES = ['none', 'reading', 'completed', 'skipped']

export default {
  props: {
    // -> A status definition from the progress registry
    status: {
      type: Object,
      required: true
    }
  },
  computed: {
    hasDot () {
      return DOT_STATUSES.includes(this.status.id)
    }
  }
}
</script>
