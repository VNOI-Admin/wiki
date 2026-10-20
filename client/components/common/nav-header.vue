<template lang='pug'>
  v-app-bar.vn-topbar(
    app
    fixed
    flat
    height='64'
    color='transparent'
    :dark='dense'
    :class='{ "is-dense": dense }'
    :clipped-left='!$vuetify.rtl'
    :clipped-right='$vuetify.rtl'
    )
    .vn-topbar__in(:class='{ "is-wide": isWide }')
      //- Small screens: the header links move into a sheet
      button.vn-iconbtn.vn-topbar__menu(
        type='button'
        @click='menuSheet = true'
        :aria-label='$t(`common:header.links`, `Liên kết`)'
        )
        v-icon mdi-menu
      a.vn-brand(href='/', :aria-label='title')
        img.vn-brand__logo(:src='logoUrl', alt='')
        span.vn-brand__name {{title}}

      //- Views put their own controls here (editor title, admin label)
      .vn-topbar__mid(v-if='$slots.mid')
        slot(name='mid')

      //- HEADER LINKS (collapse into a menu when they don't fit)
      nav.vn-nav(v-if='hasHeaderLinks && !$slots.mid', ref='linksBox', :aria-label='$t(`common:header.links`, `Liên kết`)')
        .vn-nav__measure(aria-hidden='true')
          span.vn-nav__link(
            v-for='(link, idx) of headerLinks'
            :key='`headerlink-measure-` + idx'
            ref='linkMeasure'
            :class='{ "is-ext": isExternal(link) }'
            ) {{link.name}}
        a.vn-nav__link(
          v-for='(link, idx) of visibleLinks'
          :key='`headerlink-` + idx'
          :href='link.url'
          :class='{ "is-ext": isExternal(link) }'
          :aria-current='isCurrent(link) ? `page` : null'
          :target='isExternal(link) ? `_blank` : null'
          :rel='isExternal(link) ? `noopener` : null'
          ) {{link.name}}
        v-menu(v-if='overflowLinks.length > 0', offset-y, bottom, left, content-class='vn-menu')
          template(v-slot:activator='{ on, attrs }')
            button.vn-iconbtn(type='button', v-bind='attrs', v-on='on', :aria-label='$t(`common:header.links`, `Liên kết`)')
              v-icon mdi-chevron-down
          .vn-menu__list
            a.vn-menu__item(
              v-for='(link, idx) of overflowLinks'
              :key='`headerlink-menu-` + idx'
              :href='link.url'
              :class='{ "is-ext": isExternal(link) }'
              :target='isExternal(link) ? `_blank` : null'
              ) {{link.name}}

      button.vn-searchbtn(v-if='searchShown', type='button', @click='openSearch', :aria-label='$t(`common:header.search`, `Tìm bài viết`)')
        v-icon mdi-magnify
        span.vn-searchbtn__text {{$t('common:header.searchShort', 'Tìm bài viết…')}}
        kbd /
      .vn-topbar__spacer(v-else-if='!$slots.mid')

      .vn-topbar__actions
        v-progress-circular.mr-1(indeterminate, color='primary', :size='20', :width='2', v-show='isLoading')
        slot(name='actions')

        //- LANGUAGES
        v-menu(v-if='mode === `view` && locales.length > 0', offset-y, bottom, left, max-height='320px', content-class='vn-menu')
          template(v-slot:activator='{ on, attrs }')
            button.vn-iconbtn(type='button', v-bind='attrs', v-on='on', :aria-label='$t(`common:header.language`)')
              v-icon mdi-web
          .vn-menu__list
            button.vn-menu__item(v-for='lc of locales', :key='lc.code', type='button', @click='changeLocale(lc)', :aria-checked='lc.code === locale ? `true` : `false`', role='menuitemradio')
              span.vn-mono.mr-2 {{lc.code.toUpperCase()}}
              span {{lc.name}}

        //- PAGE ACTIONS
        v-menu(v-if='hasAnyPagePermissions && path && mode !== `edit`', offset-y, bottom, left, content-class='vn-menu')
          template(v-slot:activator='{ on, attrs }')
            button.vn-iconbtn(type='button', v-bind='attrs', v-on='on', :aria-label='$t(`common:header.pageActions`)', :title='$t(`common:header.pageActions`)')
              v-icon mdi-file-document-edit-outline
          .vn-menu__list
            .vn-menu__label {{$t('common:header.currentPage')}}
            button.vn-menu__item(type='button', @click='pageView', v-if='mode !== `view`')
              v-icon(small) mdi-file-document-outline
              span {{$t('common:header.view')}}
            button.vn-menu__item(type='button', @click='pageEdit', v-if='mode !== `edit` && hasWritePagesPermission')
              v-icon(small) mdi-file-document-edit-outline
              span {{$t('common:header.edit')}}
            button.vn-menu__item(type='button', @click='pageHistory', v-if='mode !== `history` && hasReadHistoryPermission')
              v-icon(small) mdi-history
              span {{$t('common:header.history')}}
            button.vn-menu__item(type='button', @click='pageSource', v-if='mode !== `source` && hasReadSourcePermission')
              v-icon(small) mdi-code-tags
              span {{$t('common:header.viewSource')}}
            button.vn-menu__item(type='button', @click='pageConvert', v-if='hasWritePagesPermission')
              v-icon(small) mdi-lightning-bolt
              span {{$t('common:header.convert')}}
            button.vn-menu__item(type='button', @click='pageDuplicate', v-if='hasWritePagesPermission')
              v-icon(small) mdi-content-duplicate
              span {{$t('common:header.duplicate')}}
            button.vn-menu__item(type='button', @click='pageMove', v-if='hasManagePagesPermission')
              v-icon(small) mdi-content-save-move-outline
              span {{$t('common:header.move')}}
            button.vn-menu__item.is-danger(type='button', @click='pageDelete', v-if='hasDeletePagesPermission')
              v-icon(small) mdi-trash-can-outline
              span {{$t('common:header.delete')}}

        //- TAGS (small screens: in the sheet)
        a.vn-iconbtn.vn-topbar__lg(
          v-if='mode === `view`'
          href='/t'
          :aria-label='$t(`common:header.browseTags`)'
          :title='$t(`common:header.browseTags`)'
          )
          v-icon mdi-tag-multiple-outline

        //- NEW PAGE (small screens: in the sheet)
        button.vn-iconbtn.vn-topbar__lg(
          v-if='hasNewPagePermission && path && mode !== `edit`'
          type='button'
          @click='pageNew'
          :aria-label='$t(`common:header.newPage`)'
          :title='$t(`common:header.newPage`)'
          )
          v-icon mdi-text-box-plus-outline

        //- ADMIN
        template(v-if='isAuthenticated && isAdmin')
          a.vn-iconbtn.vn-topbar__lg(v-if='mode !== `admin`', href='/a', :aria-label='$t(`common:header.admin`)', :title='$t(`common:header.admin`)')
            v-icon mdi-cog
          a.vn-textbtn(v-else, href='/')
            v-icon(small) mdi-exit-to-app
            span {{$t('common:actions.exit')}}

        //- THEME TOGGLE (small screens: in the sheet)
        button.vn-iconbtn.vn-topbar__lg(
          type='button'
          @click='toggleTheme'
          :aria-label='$t(`common:header.toggleTheme`, `Đổi giao diện`)'
          :title='$vuetify.theme.dark ? $t(`common:header.lightMode`, `Chế độ sáng`) : $t(`common:header.darkMode`, `Chế độ tối`)'
          )
          v-icon {{ $vuetify.theme.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}

        //- ACCOUNT
        v-menu(v-if='isAuthenticated', offset-y, bottom, left, min-width='240', content-class='vn-menu')
          template(v-slot:activator='{ on, attrs }')
            button.vn-acctbtn.is-in(type='button', v-bind='attrs', v-on='on', :aria-label='$t(`common:header.account`) + `: ` + name')
              img(v-if='picture.kind === `image`', :src='picture.url', alt='')
              span.vn-initials(v-else) {{picture.initials}}
          .vn-menu__list
            .vn-menu__who
              img(v-if='picture.kind === `image`', :src='picture.url', alt='')
              span.vn-initials(v-else) {{picture.initials}}
              span.vn-menu__id
                span.vn-menu__name {{name}}
                span.vn-menu__email(v-if='email') {{email}}
            hr
            a.vn-menu__item(href='/p') {{$t('common:header.profile')}}
            button.vn-menu__item(type='button', @click='logout') {{$t('common:header.logout')}}
        a.vn-acctbtn(v-else, href='/login')
          v-icon mdi-account-outline
          span {{$t('common:header.login')}}

    //- Small-screen link sheet
    v-bottom-sheet(v-model='menuSheet', content-class='vn-sheet')
      .vn-sheet__panel
        .vn-sheet__head
          b {{$t('common:header.links', 'Liên kết')}}
          button.vn-iconbtn(type='button', @click='menuSheet = false', :aria-label='$t(`common:actions.close`, `Đóng`)')
            v-icon mdi-close
        nav.vn-sheet__nav
          a(href='/') {{$t('common:header.home', 'Trang chủ')}}
          a(
            v-for='(link, idx) of headerLinks'
            :key='`headerlink-sm-` + idx'
            :href='link.url'
            :class='{ "is-ext": isExternal(link) }'
            :target='isExternal(link) ? `_blank` : null'
            ) {{link.name}}
        //- Actions the header hides on phones
        .vn-sheet__tools
          hr
          nav.vn-sheet__nav
            a(v-if='mode === `view`', href='/t')
              v-icon(small) mdi-tag-multiple-outline
              span {{$t('common:header.browseTags')}}
            button(v-if='hasNewPagePermission && path && mode !== `edit`', type='button', @click='menuSheet = false; pageNew()')
              v-icon(small) mdi-text-box-plus-outline
              span {{$t('common:header.newPage')}}
            a(v-if='isAuthenticated && isAdmin && mode !== `admin`', href='/a')
              v-icon(small) mdi-cog
              span {{$t('common:header.admin')}}
            button(type='button', @click='toggleTheme')
              v-icon(small) {{ $vuetify.theme.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}
              span {{ $vuetify.theme.dark ? $t(`common:header.lightMode`, `Chế độ sáng`) : $t(`common:header.darkMode`, `Chế độ tối`) }}

    page-selector(mode='create', v-model='newPageModal', :open-handler='pageNewCreate', :locale='locale')
    page-selector(mode='move', v-model='movePageModal', :open-handler='pageMoveRename', :path='path', :locale='locale')
    page-selector(mode='create', v-model='duplicateOpts.modal', :open-handler='pageDuplicateHandle', :path='duplicateOpts.path', :locale='duplicateOpts.locale')
    page-delete(v-model='deletePageModal', v-if='path && path.length')
    page-convert(v-model='convertPageModal', v-if='path && path.length')

    .vn-devflag(v-if='isDevMode', title='This code base is NOT for production use!') DEV
</template>

<script>
import { get, sync } from 'vuex-pathify'
import _ from 'lodash'

import movePageMutation from 'gql/common/common-pages-mutation-move.gql'

/* global siteConfig, siteLangs */

export default {
  components: {
    PageDelete: () => import('./page-delete.vue'),
    PageConvert: () => import('./page-convert.vue')
  },
  props: {
    dense: {
      type: Boolean,
      default: false
    },
    hideSearch: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      newPageModal: false,
      movePageModal: false,
      convertPageModal: false,
      deletePageModal: false,
      locales: siteLangs,
      isDevMode: false,
      menuSheet: false,
      visibleLinkCount: Infinity,
      duplicateOpts: {
        locale: 'en',
        path: 'new-page',
        modal: false
      }
    }
  },
  computed: {
    search: sync('site/search'),
    searchIsFocused: sync('site/searchIsFocused'),
    searchIsLoading: sync('site/searchIsLoading'),
    isLoading: get('isLoading'),
    title: get('site/title'),
    logoUrl: get('site/logoUrl'),
    headerLinks: get('site/headerLinks'),
    hasHeaderLinks () {
      return this.headerLinks.length > 0
    },
    // -> Admin, editor and other tool views use the full width; reading views use the page column
    searchShown () {
      return !this.hideSearch && !this.dense
    },
    isWide () {
      return this.dense || this.hideSearch || ['edit', 'admin', 'history', 'source'].includes(this.mode)
    },
    visibleLinks () {
      return _.take(this.headerLinks, this.visibleLinkCount)
    },
    overflowLinks () {
      return _.drop(this.headerLinks, this.visibleLinkCount)
    },
    path: get('page/path'),
    locale: get('page/locale'),
    mode: get('page/mode'),
    name: get('user/name'),
    email: get('user/email'),
    pictureUrl: get('user/pictureUrl'),
    isAuthenticated: get('user/authenticated'),
    permissions: get('user/permissions'),
    picture () {
      if (this.pictureUrl && this.pictureUrl.length > 1) {
        return {
          kind: 'image',
          url: (this.pictureUrl === 'internal') ? `/_userav/${this.$store.get('user/id')}` : this.pictureUrl
        }
      } else {
        const nameParts = this.name.toUpperCase().split(' ')
        let initials = _.head(nameParts).charAt(0)
        if (nameParts.length > 1) {
          initials += _.last(nameParts).charAt(0)
        }
        return {
          kind: 'initials',
          initials
        }
      }
    },
    isAdmin () {
      return _.intersection(this.permissions, ['manage:system', 'write:users', 'manage:users', 'write:groups', 'manage:groups', 'manage:navigation', 'manage:theme', 'manage:api']).length > 0
    },
    hasNewPagePermission () {
      return this.hasAdminPermission || _.intersection(this.permissions, ['write:pages']).length > 0
    },
    hasAdminPermission: get('page/effectivePermissions@system.manage'),
    hasWritePagesPermission: get('page/effectivePermissions@pages.write'),
    hasManagePagesPermission: get('page/effectivePermissions@pages.manage'),
    hasDeletePagesPermission: get('page/effectivePermissions@pages.delete'),
    hasReadSourcePermission: get('page/effectivePermissions@source.read'),
    hasReadHistoryPermission: get('page/effectivePermissions@history.read'),
    hasAnyPagePermissions () {
      return this.hasAdminPermission || this.hasWritePagesPermission || this.hasManagePagesPermission ||
        this.hasDeletePagesPermission || this.hasReadSourcePermission || this.hasReadHistoryPermission
    }
  },
  mounted () {
    this.$root.$on('pageEdit', () => {
      this.pageEdit()
    })
    this.$root.$on('pageHistory', () => {
      this.pageHistory()
    })
    this.$root.$on('pageSource', () => {
      this.pageSource()
    })
    this.$root.$on('pageMove', () => {
      this.pageMove()
    })
    this.$root.$on('pageConvert', () => {
      this.pageConvert()
    })
    this.$root.$on('pageDuplicate', () => {
      this.pageDuplicate()
    })
    this.$root.$on('pageDelete', () => {
      this.pageDelete()
    })
    this.isDevMode = siteConfig.devMode === true
    this.onKeydown = ev => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) || ev.target.isContentEditable
      if (!this.searchShown) { return }
      // -> Autofill sends keydown events with no key
      const key = (ev.key || '').toLowerCase()
      if ((key === '/' && !typing) || (key === 'k' && (ev.metaKey || ev.ctrlKey))) {
        ev.preventDefault()
        this.openSearch()
      }
    }
    document.addEventListener('keydown', this.onKeydown)
    this.$watch('headerLinks', () => this.$nextTick(this.fitHeaderLinks), { immediate: true })
    this.linksResizeHandler = _.throttle(this.fitHeaderLinks, 100, { leading: true, trailing: true })
    if (typeof ResizeObserver !== 'undefined') {
      this.linksResizeObserver = new ResizeObserver(this.linksResizeHandler)
    } else {
      window.addEventListener('resize', this.linksResizeHandler)
    }
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.onKeydown)
    if (this.linksResizeObserver) {
      this.linksResizeObserver.disconnect()
    } else {
      window.removeEventListener('resize', this.linksResizeHandler)
    }
  },
  methods: {
    /**
     * Show as many header links as fit next to the title; the rest go in a menu.
     * Widths come from an invisible copy of every link, so the result doesn't
     * depend on which links are currently shown.
     */
    fitHeaderLinks () {
      const box = this.$refs.linksBox
      if (!box) { return }
      if (this.linksResizeObserver && this.observedLinksBox !== box) {
        this.linksResizeObserver.disconnect()
        this.linksResizeObserver.observe(box)
        this.observedLinksBox = box
      }
      // -> Each link plus the 4px gap between links
      const widths = _.map(this.$refs.linkMeasure || [], el => Math.ceil(el.getBoundingClientRect().width) + 4)
      const available = box.clientWidth
      // -> The last link has no gap after it
      if (_.sum(widths) - 4 <= available) {
        this.visibleLinkCount = widths.length
        return
      }
      // -> Keep room for the overflow menu button
      let used = 44
      let count = 0
      while (count < widths.length && used + widths[count] <= available) {
        used += widths[count]
        count++
      }
      this.visibleLinkCount = count
    },
    /**
     * A link is external when it points at another host. It opens in a new tab and gets an arrow.
     */
    isExternal (link) {
      try {
        return new URL(link.url, window.location.origin).host !== window.location.host
      } catch (err) {
        return false
      }
    },
    /**
     * A link is current when the page path starts with the link path (locale prefix ignored).
     */
    isCurrent (link) {
      if (this.isExternal(link)) { return false }
      const strip = p => decodeURIComponent(p).replace(/^\/[a-z]{2}(?=\/|$)/i, '').replace(/\/+$/, '').toLowerCase()
      const target = strip(new URL(link.url, window.location.origin).pathname)
      const here = strip(window.location.pathname)
      return target.length > 0 && (here === target || here.startsWith(target + '/'))
    },
    openSearch () {
      this.searchIsFocused = true
    },
    searchFocus () {
      this.searchIsFocused = true
    },
    searchBlur () {
      this.searchIsFocused = false
    },
    pageNew () {
      this.newPageModal = true
    },
    pageNewCreate ({ path, locale }) {
      window.location.assign(`/e/${locale}/${path}`)
    },
    pageView () {
      window.location.assign(`/${this.locale}/${this.path}`)
    },
    pageEdit () {
      window.location.assign(`/e/${this.locale}/${this.path}`)
    },
    pageHistory () {
      window.location.assign(`/h/${this.locale}/${this.path}`)
    },
    pageSource () {
      window.location.assign(`/s/${this.locale}/${this.path}`)
    },
    pageDuplicate () {
      const pathParts = this.path.split('/')
      this.duplicateOpts = {
        locale: this.locale,
        path: (pathParts.length > 1) ? _.initial(pathParts).join('/') + `/new-page` : `new-page`,
        modal: true
      }
    },
    pageDuplicateHandle ({ locale, path }) {
      window.location.assign(`/e/${locale}/${path}?from=${this.$store.get('page/id')}`)
    },
    pageConvert () {
      this.convertPageModal = true
    },
    pageMove () {
      this.movePageModal = true
    },
    async pageMoveRename ({ path, locale }) {
      this.$store.commit(`loadingStart`, 'page-move')
      try {
        const resp = await this.$apollo.mutate({
          mutation: movePageMutation,
          variables: {
            id: this.$store.get('page/id'),
            destinationLocale: locale,
            destinationPath: path
          }
        })
        if (_.get(resp, 'data.pages.move.responseResult.succeeded', false)) {
          window.location.replace(`/${locale}/${path}`)
        } else {
          throw new Error(_.get(resp, 'data.pages.move.responseResult.message', this.$t('common:error.unexpected')))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
        this.$store.commit(`loadingStop`, 'page-move')
      }
    },
    pageDelete () {
      this.deletePageModal = true
    },
    assets () {
      // window.location.assign(`/f`)
      this.$store.commit('showNotification', {
        style: 'indigo',
        message: `Coming soon...`,
        icon: 'ferry'
      })
    },
    async changeLocale (locale) {
      await this.$i18n.i18next.changeLanguage(locale.code)
      switch (this.mode) {
        case 'view':
        case 'history':
          window.location.assign(`/${locale.code}/${this.path}`)
          break
      }
    },
    logout () {
      window.location.assign('/logout')
    },
    goHome () {
      window.location.assign('/')
    },
    toggleTheme () {
      this.$vuetify.theme.dark = !this.$vuetify.theme.dark

      const newTheme = this.$vuetify.theme.dark ? 'dark' : 'light'
      localStorage.setItem('theme', newTheme)
    }
  }
}
</script>

<style lang='scss'>

// ---------------------------------
// TOP BAR
// ---------------------------------

// -> The editor keeps a dark header in both themes: its title field and labels are white
#root .v-app-bar.vn-topbar.is-dense {
  --surface: #141a24;
  --sunken: #1a2130;
  --ink: #e6eaf2;
  --muted: #98a2b6;
  --line: #252e40;
  --accent: #7ea8ff;
  --accent-soft: #17233d;
}

#root .v-app-bar.vn-topbar {
  background: color-mix(in srgb, var(--surface) 92%, transparent) !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line) !important;
  box-shadow: none !important;
  color: var(--ink);

  .v-toolbar__content {
    padding: 0;
  }
}

.vn-topbar__in {
  width: 100%;
  max-width: var(--wrap);
  height: 64px;
  margin: 0 auto;
  padding-inline: 20px;
  display: flex;
  align-items: center;
  gap: 18px;

  &.is-wide {
    max-width: none;
  }
}

.vn-topbar__menu {
  display: none !important;
}

.vn-topbar__spacer {
  flex: 1 1 auto;
}

.vn-topbar__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

.vn-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  color: var(--ink) !important;
  font-weight: 700;
  font-size: 1.0625rem;
  white-space: nowrap;
  text-decoration: none !important;
}

.vn-brand__logo {
  height: 28px;
  width: auto;
  display: block;
}

.vn-nav {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.vn-nav__measure {
  position: absolute;
  top: 0;
  left: 0;
  width: max-content;
  display: flex;
  visibility: hidden;
  pointer-events: none;
}

.vn-nav__link {
  flex: none;
  padding: 6px 10px;
  border-radius: 8px;
  color: var(--muted) !important;
  font-weight: 500;
  font-size: 0.9375rem;
  white-space: nowrap;
  text-decoration: none !important;

  &:hover, &[aria-current='page'] {
    color: var(--ink) !important;
    background: var(--sunken);
  }
}

.is-ext::after {
  content: ' ↗';
  font-size: 0.8em;
  color: var(--muted);
}

.vn-searchbtn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 1 15rem;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--muted);
  font-size: 0.9375rem;
  text-align: left;

  &:hover {
    border-color: var(--accent);
  }

  .v-icon {
    color: var(--muted) !important;
    font-size: 20px !important;
  }

  &__text {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  kbd {
    font: 500 0.75rem var(--font-mono);
    border: 1px solid var(--line);
    border-bottom-width: 2px;
    border-radius: 4px;
    padding: 1px 6px;
    color: var(--muted);
    background: var(--surface);
    box-shadow: none;
  }
}

.vn-iconbtn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 8px;
  color: var(--muted);
  text-decoration: none !important;

  &:hover {
    background: var(--sunken);
  }

  .v-icon {
    color: var(--muted) !important;
    font-size: 21px !important;
  }

  &:hover .v-icon {
    color: var(--ink) !important;
  }
}

.vn-textbtn, .vn-acctbtn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--ink) !important;
  font-weight: 600;
  font-size: 0.9375rem;
  text-decoration: none !important;
  white-space: nowrap;

  &:hover {
    background: var(--sunken);
  }

  .v-icon {
    color: var(--muted) !important;
  }
}

.vn-acctbtn.is-in {
  width: 40px;
  padding: 0;
  justify-content: center;

  img {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    object-fit: cover;
  }
}

.vn-initials {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 0.75rem;
  font-weight: 700;
}

.vn-devflag {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--mark-red);
  color: #fff;
  font: 600 0.625rem/1.6 var(--font-mono);
  pointer-events: none;
}

@media (max-width: 860px) {
  .vn-nav {
    display: none;
  }
  .vn-topbar__menu {
    display: grid !important;
  }
  .vn-topbar__in {
    gap: 8px;
    padding-inline: 12px;
  }
  .vn-searchbtn {
    flex: 1 1 auto;

    kbd {
      display: none;
    }
  }
}

@media (max-width: 640px) {
  .vn-topbar__lg {
    display: none !important;
  }
  .vn-acctbtn:not(.is-in) span {
    display: none;
  }
  .vn-acctbtn {
    width: 40px;
    padding: 0;
    justify-content: center;
  }
}

@media (max-width: 420px) {
  .vn-brand__name {
    display: none;
  }
}

// ---------------------------------
// MENUS (shared by every v-menu with content-class vn-menu)
// ---------------------------------

.v-menu__content.vn-menu {
  border: 1px solid var(--line);
  border-radius: 12px !important;
  background: var(--surface);
  box-shadow: var(--shadow) !important;
}

.vn-menu__list {
  display: grid;
  gap: 2px;
  min-width: 12rem;
  padding: 6px;
  background: var(--surface);

  hr {
    border: 0;
    border-top: 1px solid var(--line);
    margin: 4px 2px;
  }
}

.vn-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--ink) !important;
  font-size: 0.9375rem;
  text-align: left;
  text-decoration: none !important;

  &:hover {
    background: var(--sunken);
  }

  &[aria-checked='true'] {
    background: var(--accent-soft);
    font-weight: 600;
  }

  .v-icon {
    color: var(--muted) !important;
  }

  &.is-danger, &.is-danger .v-icon {
    color: var(--mark-red) !important;
  }
}

.vn-menu__label {
  padding: 8px 10px 4px;
  font: 600 0.75rem/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.vn-menu__note {
  max-width: 16rem;
  padding: 6px 10px;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--muted);
}

.vn-menu__who {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;

  img {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }
}

.vn-menu__id {
  display: grid;
  min-width: 0;
}

.vn-menu__name {
  font-weight: 600;
  color: var(--ink);
}

.vn-menu__email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
  color: var(--muted);
}

.vn-topbar__mid {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

// ---------------------------------
// SHEET (small-screen menu)
// ---------------------------------

// -> Vuetify gives a bottom sheet visible overflow: a long sheet (the roadmap rail) scrolls inside itself
.v-dialog.v-bottom-sheet.vn-sheet {
  overflow-y: auto;
  overscroll-behavior: contain;
}

.vn-sheet__panel {
  background: var(--surface);
  border-radius: 16px 16px 0 0;
  padding: 8px 18px calc(18px + env(safe-area-inset-bottom, 0px));
}

.vn-sheet__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  b {
    font-size: 1.0625rem;
    color: var(--ink);
  }
}

.vn-sheet__tools {
  display: none;

  hr {
    border: 0;
    border-top: 1px solid var(--line);
    margin: 8px 0;
  }

  @media (max-width: 640px) {
    display: block;
  }
}

.vn-sheet__nav {
  display: grid;
  gap: 2px;

  a,
  button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    padding: 12px 10px;
    border-radius: 8px;
    color: var(--ink) !important;
    font-weight: 500;
    text-decoration: none !important;

    &:hover {
      background: var(--sunken);
    }

    .v-icon {
      color: var(--muted);
    }
  }
}

</style>
