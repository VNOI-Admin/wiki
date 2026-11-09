<template lang='pug'>
  v-snackbar.nav-notify(
    :color='notification.style'
    top
    multi-line
    v-model='notificationState'
    :timeout='paused ? -1 : 6000'
    :class='{ "is-paused": paused }'
    @mouseenter.native='hovered = true'
    @mouseleave.native='hovered = false'
    @focusin.native='focused = true'
    @focusout.native='focused = false'
    )
    .text-left
      v-icon.mr-3(dark) mdi-{{ notification.icon }}
      span {{ notification.message }}
    template(v-slot:action='{ attrs }')
      v-btn(v-bind='attrs', icon, dark, small, @click='notificationState = false', :aria-label='$t(`common:actions.close`, `Đóng`)')
        v-icon(small) mdi-close
</template>

<script>
import { get, sync } from 'vuex-pathify'

export default {
  data() {
    return {
      hovered: false,
      focused: false
    }
  },
  computed: {
    notification: get('notification'),
    notificationState: sync('notification@isActive'),
    // -> The toast stays while the pointer or the focus is on it
    paused () { return this.hovered || this.focused }
  },
  watch: {
    notificationState: {
      immediate: true,
      handler (on) {
        if (on) {
          document.addEventListener('keydown', this.onKeydown)
        } else {
          document.removeEventListener('keydown', this.onKeydown)
          this.hovered = this.focused = false
        }
      }
    }
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.onKeydown)
  },
  methods: {
    onKeydown (ev) {
      // -> Esc in a dialog, a menu or an open select closes that one only
      const inPopup = ev.target instanceof Element && ev.target.closest('[role="dialog"], [role="menu"], .v-dialog__content, .v-menu__content, .v-select--is-menu-active')
      if (ev.key === 'Escape' && !ev.defaultPrevented && !inPopup) {
        this.notificationState = false
      }
    }
  }
}
</script>

<style lang='scss'>
.nav-notify {
  top: -64px;
  padding-top: 0;
  z-index: 999;

  .v-snack__wrapper {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    position: relative;
    margin-top: 0;

    &::after {
      content: '';
      display: block;
      width: 100%;
      height: 2px;
      background-color: rgba(255,255,255,.4);
      position: absolute;
      bottom: 0;
      left: 0;
      animation: nav-notify-anim 6s linear;
    }
  }

  &.is-paused .v-snack__wrapper::after {
    animation: none;
  }
}

@keyframes nav-notify-anim {
  0% {
    width: 100%;
  }
  100% {
    width: 0%;
  }
}
</style>
