<template lang="pug">
  span.vn-stars(
    role='img'
    :aria-label='$t(`common:roadmap.difficulty`, { defaultValue: `Độ khó {{n}} / 5`, n: value })'
    :title='$t(`common:roadmap.difficulty`, { defaultValue: `Độ khó {{n}} / 5`, n: value })'
    )
    i(v-for='i in 5', :key='i', :class='starClass(i)', aria-hidden='true')
</template>

<script>
export default {
  props: {
    // -> 0 to 5, in half steps
    value: {
      type: Number,
      default: 0
    }
  },
  methods: {
    starClass (i) {
      if (this.value >= i) { return 'is-on' }
      if (this.value >= i - 0.5) { return 'is-half' }
      return ''
    }
  }
}
</script>
