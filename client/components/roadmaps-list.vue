<template lang="pug">
  v-app(:dark='$vuetify.theme.dark')
    nav-header
    v-main
      .vn-wrap.vn-rml
        header.vn-rml__head
          h1 {{ $t('common:roadmap.listTitle', 'Lộ trình học') }}
        ul.vn-rml__grid(v-if='parsedRoadmaps.length > 0')
          li(v-for='roadmap in parsedRoadmaps', :key='roadmap.id')
            a.vn-rml__card(:href='`/roadmap/` + roadmap.id')
              b {{ roadmap.title }}
              p(v-if='roadmap.description') {{ roadmap.description }}
              span.vn-rml__n {{ countLabel(roadmap.articleCount) }}
        p.vn-rml__none(v-else) {{ $t('common:roadmap.listEmptyAll', 'Chưa có lộ trình học nào.') }}
    nav-footer
    search-results
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
  },
  methods: {
    countLabel (count) {
      return this.$t('common:roadmap.articleCount', { defaultValue: '{{count}} bài', count })
    }
  }
}
</script>

<style lang="scss">
.vn-rml {
  padding-block: 40px 56px;
  color: var(--ink);
}

.vn-rml__head h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3.6vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.vn-rml__grid {
  list-style: none;
  margin: 20px 0 0 !important;
  padding: 0 !important;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 16px;
}

.vn-rml__card {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 8px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink) !important;
  text-decoration: none !important;

  &:hover {
    border-color: var(--accent);
  }

  b {
    font-size: 1.0625rem;
    font-weight: 700;
    line-height: 1.35;
  }

  p {
    margin: 0 !important;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.9375rem;
    color: var(--muted);
  }
}

.vn-rml__n {
  font: 500 0.8125rem var(--font-mono);
  color: var(--muted);
}

.vn-rml__none {
  margin-top: 20px;
  color: var(--muted);
}
</style>
