<template lang='pug'>
  v-app(:dark='$vuetify.theme.dark').profile
    nav-header
    v-main.vn-pshell
      //- Account sections, as tabs (the side drawer did not fit phones)
      nav.vn-ptabs(:aria-label='$t(`profile:title`)')
        router-link(to='/profile')
          v-icon(small) mdi-face-profile
          span {{$t('profile:title')}}
        router-link(to='/pages')
          v-icon(small) mdi-file-document-outline
          span {{$t('profile:pages.title')}}
      transition(name='profile-router')
        router-view

    nav-footer
    notify
    search-results
</template>

<script>
import VueRouter from 'vue-router'

/* global WIKI */

const router = new VueRouter({
  mode: 'history',
  base: '/p',
  routes: [
    { path: '/', redirect: '/profile' },
    { path: '/profile', component: () => import(/* webpackChunkName: "profile" */ './profile/profile.vue') },
    { path: '/pages', component: () => import(/* webpackChunkName: "profile" */ './profile/pages.vue') },
    { path: '/comments', component: () => import(/* webpackChunkName: "profile" */ './profile/comments.vue') }
  ]
})

router.beforeEach((to, from, next) => {
  WIKI.$store.commit('loadingStart', 'profile')
  next()
})

router.afterEach((to, from) => {
  WIKI.$store.commit('loadingStop', 'profile')
})

export default {
  i18nOptions: { namespaces: 'profile' },
  data() {
    return {
      profileDrawerShown: true
    }
  },
  router,
  created() {
    this.$store.commit('page/SET_MODE', 'profile')
  }
}
</script>

<style lang='scss'>
.vn-pshell {
  background: var(--bg);
}

.vn-ptabs {
  max-width: var(--wrap);
  margin: 0 auto;
  // -> 12px: the left edge of the v-container contents below
  padding: 16px 12px 0;
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--line);

  a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: -1px;
    padding: 10px 14px;
    border-bottom: 2px solid transparent;
    color: var(--muted) !important;
    font-weight: 500;
    text-decoration: none !important;

    .v-icon {
      color: inherit !important;
    }

    &:hover {
      color: var(--ink) !important;
    }

    &.router-link-active {
      border-bottom-color: var(--accent);
      color: var(--ink) !important;
    }
  }
}

.profile-router {
  &-enter-active, &-leave-active {
    transition: opacity .25s ease;
    opacity: 1;
  }
  &-enter-active {
    transition-delay: .25s;
  }
  &-enter, &-leave-to {
    opacity: 0;
  }
}

.profile-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;

  &-title {
    margin-left: 1rem;
  }
}

</style>
