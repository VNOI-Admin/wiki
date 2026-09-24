<template lang="pug">
  v-card.roadmap-stats-bar.mb-4(flat, outlined)
    v-card-text.py-3
      .d-flex.align-center.flex-wrap.gap-4.mb-2
        .stat-item
          v-icon(small, color='success') mdi-check-circle
          span.ml-1.caption {{ stats.completed }} Completed
        .stat-item
          v-icon(small, color='blue') mdi-book-open-blank-variant
          span.ml-1.caption {{ stats.reading }} Reading
        .stat-item
          v-icon(small, color='orange') mdi-chevron-double-right
          span.ml-1.caption {{ stats.skipped }} Skipped
        .stat-item
          v-icon(small, color='grey') mdi-circle-outline
          span.ml-1.caption {{ stats.notStarted }} Not Started
        v-spacer
        span.caption.font-weight-medium {{ stats.percent }}%
      v-progress-linear(
        :value='stats.percent'
        color='success'
        background-color='grey lighten-2'
        rounded
        height='6'
      )
</template>

<script>
export default {
  props: {
    stats: { type: Object, required: true }
  }
}
</script>

<style lang="scss">
.roadmap-stats-bar {
  .stat-item {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    margin-right: 16px;
  }

  .gap-4 {
    gap: 4px;
  }
}
</style>
