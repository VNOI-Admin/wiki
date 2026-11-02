<template lang="pug">
  v-app(:dark='$vuetify.theme.dark', :class='$vuetify.rtl ? `is-rtl` : `is-ltr`')
    //- Page tools: in the TOC column on wide screens, at the article end on narrow screens
    mixin pageTools
      a.vn-linkbtn(v-if='hasReadHistoryPermission', :href='`/h/` + locale + `/` + path')
        v-icon(small) mdi-history
        span {{$t('common:header.history')}}
      v-menu(offset-y, top, min-width='260', content-class='vn-menu')
        template(v-slot:activator='{ on }')
          button.vn-linkbtn(type='button', v-on='on')
            v-icon(small) mdi-share-variant
            span {{$t('common:page.share')}}
        social-sharing(:url='pageUrl', :title='title', :description='description')
      button.vn-linkbtn(type='button', @click='print')
        v-icon(small) mdi-printer
        span {{$t('common:page.printFormat')}}
    nav-header(v-if='!printView')
    //- How far the reader is in the article text
    .vn-readprog(v-if='autoProgressOn && !printView', aria-hidden='true')
      i(ref='readProg')
    v-main(ref='content')
      //- Print view: a way back to the page (the bar does not print)
      .vn-printbar(v-if='printView')
        button.vn-btn.is-ghost(type='button', @click='print')
          v-icon(small) mdi-arrow-left
          span {{$t('common:page.exitPrint', 'Thoát bản in')}}
      //- The article list page shows as a catalogue with filters
      articles-catalog(v-if='catalogDecoded', :catalog='catalogDecoded', :title='title')
      //- Home: the dashboard, then the page contents
      home-dashboard(v-if='homeDecoded', :home='homeDecoded')
      .vn-doc(v-if='!catalogDecoded', :class='{ "is-home": homeDecoded, "has-rail": railShown && !printView, "rail-folded": railFolded, "toc-folded": tocFolded }')
        //- LEFT RAIL: the roadmap that holds this page, else its catalogue topics, else the admin navigation
        aside.vn-rail(v-if='railShown && !printView', :aria-label='railRoadmap ? railRoadmap.title : $t(`common:page.siteNav`, `Điều hướng`)')
          nav-roadmap(
            v-if='railRoadmap && !railMenu'
            :roadmap='railRoadmap'
            :roadmaps='currentRoadmap ? roadmapsDecoded : []'
            :locale='locale'
            :path='path'
            :can-show-menu='navMode !== `NONE`'
            @select='selectRoadmap'
            @show-menu='railMenu = true'
            @hide='setRailHidden(true)'
            )
          template(v-else)
            button.vn-railback(v-if='railRoadmap', type='button', @click='railMenu = false') ← {{ railRoadmap.title }}
            nav-sidebar(:items='sidebarDecoded', :nav-mode='navMode')
        //- A hidden rail leaves a button at the top left of the window. Its column keeps
        //- the text clear of the button when the columns fill the width.
        aside.vn-railfold(v-if='railFolded')
          button.vn-railopen(type='button', @click='setRailHidden(false)')
            v-icon(small) mdi-map-marker-path
            span {{ railRoadmap ? $t('common:roadmap.show', 'Hiện lộ trình') : $t('common:page.siteNav', 'Điều hướng') }}

        //- ARTICLE
        article.vn-article
          nav.vn-crumbs(v-if='path !== `home` && !homeDecoded', :aria-label='$t(`common:page.breadcrumb`, `Đường dẫn`)')
            template(v-for='(crumb, idx) of breadcrumbs')
              span(v-if='idx > 0', aria-hidden='true') /
              a(:href='crumb.path', :key='crumb.path') {{ crumb.name }}
          .vn-unpub(v-if='!isPublished')
            v-icon(small) mdi-minus-circle
            span {{$t('common:page.unpublishedWarning')}}
          h1.vn-title(v-if='!homeDecoded') {{title}}
          p.vn-desc(v-if='description && !homeDecoded') {{description}}
          .vn-meta(v-if='!homeDecoded')
            span.vn-meta__level(v-if='articleDecoded && articleDecoded.stars')
              vn-stars(:value='articleDecoded.stars')
              span {{ levelLabel }}
            page-progress-selector(
              v-if='!progressExcluded && !printView'
              :page-id='pageId'
              :locale='locale'
              :path='path'
              :title='title'
              )
            button.vn-linkbtn(v-if='commentsEnabled && commentsPerms.read && !printView', type='button', @click='goToComments()')
              v-icon(small) mdi-comment-text-outline
              span(v-if='commentsCount > 0') {{commentsLabel}}
              span(v-else) {{$t('common:comments.title')}}
            span.vn-meta__by(v-if='authorName')
              | {{ authorName }} · {{ updatedAt | moment('L') }}
            a.vn-linkbtn(v-if='hasWritePagesPermission && editShortcutsObj.editMenuBar && editShortcutsObj.editMenuBtn', href='#', @click.prevent='pageEdit')
              v-icon(small) mdi-pencil
              span {{$t('common:actions.edit')}}
            a.vn-linkbtn(v-if='editShortcutsObj.editMenuBar && editShortcutsObj.editMenuExternalBtn', :href='editMenuExternalUrl', target='_blank', rel='noopener')
              v-icon(small) {{ editShortcutsObj.editMenuExternalIcon }}
              span {{$t(`common:page.editExternal`, { name: editShortcutsObj.editMenuExternalName })}}

          .contents(ref='container', @click='openImage')
            slot(name='contents')

          .vn-tags(v-if='visibleTags.length > 0')
            a.vn-tag(
              v-for='tag in visibleTags'
              :href='`/t/` + tag.tag'
              :key='`tag-` + tag.tag'
              ) \#{{tag.title}}
            a.vn-tag(
              v-if='visibleTags.length > 1'
              :href='`/t/` + visibleTags.map(t => t.tag).join(`/`)'
              :aria-label='$t(`common:page.tagsMatching`)'
              :title='$t(`common:page.tagsMatching`)'
              )
              v-icon(small) mdi-tag-multiple-outline

          .vn-endtools(v-if='!printView && !homeDecoded')
            +pageTools

          nav.vn-nextprev(v-if='prevNode || nextNode', :aria-label='$t(`common:page.prevNext`, `Bài trước và bài sau`)')
            a(v-if='prevNode', :href='prevNode.href', rel='prev')
              span.vn-nextprev__k ← {{$t('common:page.prev', 'Bài trước')}}
              b {{prevNode.title}}
            span(v-else)
            a.is-next(v-if='nextNode', :href='nextNode.href', rel='next')
              span.vn-nextprev__k {{$t('common:page.next', 'Bài tiếp')}} →
              b {{nextNode.title}}

          section.vn-comments#discussion(v-if='commentsEnabled && commentsPerms.read && !printView && !homeDecoded')
            h2 {{$t('common:comments.title')}}
              span.vn-comments__n(v-if='commentsCount > 0') {{commentsCount}}
            slot(name='comments')

        //- RIGHT COLUMN: table of contents and page tools
        //- Home has no TOC and no page tools: history stays in the header page menu
        aside.vn-toc(v-if='!printView && !homeDecoded && !tocFolded', :aria-label='$t(`common:page.toc`)')
          template(v-if='hasToc && tocOn')
            .vn-toc__head
              .vn-label {{$t('common:page.toc')}}
              button.vn-toc__hide(
                type='button'
                @click='setTocHidden(true)'
                :title='$t(`common:page.tocHide`, `Ẩn mục lục`)'
                :aria-label='$t(`common:page.tocHide`, `Ẩn mục lục`)'
                ) ×
            a(
              v-for='item of tocFlat'
              :key='item.anchor'
              :href='item.anchor'
              :class='{ "is-sub": item.sub, "is-active": item.anchor === activeAnchor }'
              @click.prevent='goToAnchor(item.anchor)'
              ) {{item.title}}
          .vn-toc__tools
            +pageTools
        //- A hidden TOC leaves a column of ticks. Hover or focus opens the full list.
        nav.vn-tocfold(v-if='tocFolded', :aria-label='$t(`common:page.toc`)')
          .vn-tocfold__ticks(aria-hidden='true')
            i(
              v-for='item of tocFlat'
              :key='`t-` + item.anchor'
              :class='{ "is-sub": item.sub, "is-active": item.anchor === activeAnchor }'
              )
          .vn-tocfold__panel.vn-toc
            .vn-toc__head
              .vn-label {{$t('common:page.toc')}}
              button.vn-toc__hide(
                type='button'
                @click='setTocHidden(false)'
                :title='$t(`common:page.tocShow`, `Hiện mục lục`)'
                :aria-label='$t(`common:page.tocShow`, `Hiện mục lục`)'
                )
                v-icon(small) mdi-dock-right
            a(
              v-for='item of tocFlat'
              :key='`f-` + item.anchor'
              :href='item.anchor'
              :class='{ "is-sub": item.sub, "is-active": item.anchor === activeAnchor }'
              @click.prevent='onFoldLink($event, item.anchor)'
              ) {{item.title}}

      //- Narrow screens: the rail and the TOC open as sheets from a bottom bar
      .vn-readbar(v-if='readbarOn')
        button.is-rail(v-if='railAvailable', type='button', @click='railSheet = true')
          v-icon(small) mdi-map-marker-path
          span {{ railRoadmap ? railRoadmap.title : $t('common:page.siteNav', 'Điều hướng') }}
        button.is-toc(v-if='hasToc && tocOn', type='button', @click='tocSheet = true')
          v-icon(small) mdi-format-list-bulleted
          span {{$t('common:page.toc')}}

      v-bottom-sheet(v-model='tocSheet', content-class='vn-sheet', scrollable)
        .vn-sheet__panel
          .vn-sheet__head
            b {{$t('common:page.toc')}}
            button.vn-iconbtn(type='button', @click='tocSheet = false', :aria-label='$t(`common:actions.close`, `Đóng`)')
              v-icon mdi-close
          .vn-toc.is-sheet
            a(
              v-for='item of tocFlat'
              :key='`m-` + item.anchor'
              :href='item.anchor'
              :class='{ "is-sub": item.sub, "is-active": item.anchor === activeAnchor }'
              @click.prevent='tocSheet = false; goToAnchor(item.anchor)'
              ) {{item.title}}
      v-bottom-sheet(v-if='railAvailable', v-model='railSheet', content-class='vn-sheet', scrollable)
        .vn-sheet__panel
          nav-roadmap(
            ref='sheetRoadmap'
            v-if='railRoadmap && !railMenu'
            :roadmap='railRoadmap'
            :roadmaps='currentRoadmap ? roadmapsDecoded : []'
            :locale='locale'
            :path='path'
            :can-hide='false'
            :can-show-menu='navMode !== `NONE`'
            @select='selectRoadmap'
            @show-menu='railMenu = true'
            )
          template(v-else)
            button.vn-railback(v-if='railRoadmap', type='button', @click='railMenu = false') ← {{ railRoadmap.title }}
            nav-sidebar(:items='sidebarDecoded', :nav-mode='navMode')

      //- An article image at full size
      v-dialog(v-model='lightbox', content-class='vn-lightbox', max-width='none')
        img(v-if='lightboxImg', :src='lightboxImg.src', :alt='lightboxImg.alt', @click='lightbox = false')

      //- Editor speed dial, when the admin turns it on
      v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasAnyPagePermissions && editShortcutsObj.editFab')
        template(v-slot:activator='{ on: onEditActivator }')
          v-speed-dial(
            v-model='pageEditFab'
            direction='top'
            open-on-hover
            transition='scale-transition'
            bottom
            :right='!$vuetify.rtl'
            :left='$vuetify.rtl'
            fixed
            dark
            )
            template(v-slot:activator)
              v-btn.btn-animate-edit(
                fab
                color='primary'
                v-model='pageEditFab'
                @click='pageEdit'
                v-on='onEditActivator'
                :disabled='!hasWritePagesPermission'
                :aria-label='$t(`common:page.editPage`)'
                )
                v-icon mdi-pencil
            v-btn(v-if='hasReadHistoryPermission', fab, small, color='white', light, @click='pageHistory', :aria-label='$t(`common:header.history`)')
              v-icon(size='20') mdi-history
            v-btn(v-if='hasReadSourcePermission', fab, small, color='white', light, @click='pageSource', :aria-label='$t(`common:header.viewSource`)')
              v-icon(size='20') mdi-code-tags
            v-btn(v-if='hasWritePagesPermission', fab, small, color='white', light, @click='pageConvert', :aria-label='$t(`common:header.convert`)')
              v-icon(size='20') mdi-lightning-bolt
            v-btn(v-if='hasWritePagesPermission', fab, small, color='white', light, @click='pageDuplicate', :aria-label='$t(`common:header.duplicate`)')
              v-icon(size='20') mdi-content-duplicate
            v-btn(v-if='hasManagePagesPermission', fab, small, color='white', light, @click='pageMove', :aria-label='$t(`common:header.move`)')
              v-icon(size='20') mdi-content-save-move-outline
            v-btn(v-if='hasDeletePagesPermission', fab, dark, small, color='red', @click='pageDelete', :aria-label='$t(`common:header.delete`)')
              v-icon(size='20') mdi-trash-can-outline
        span {{$t('common:page.editPage')}}

    v-fab-transition
      button.vn-totop(
        v-if='upBtnShown && !printView'
        type='button'
        :class='{ "has-fab": hasAnyPagePermissions && editShortcutsObj.editFab, "has-bar": readbarOn }'
        @click='$vuetify.goTo(0, scrollOpts)'
        :aria-label='$t(`common:actions.returnToTop`)'
        :title='$t(`common:actions.returnToTop`)'
        )
        v-icon mdi-arrow-up
    nav-footer(v-if='!printView')
    notify
    search-results
</template>

<script>
import Tabset from './tabset.vue'
import NavSidebar from './nav-sidebar.vue'
import NavRoadmap from './nav-roadmap.vue'
import ArticlesCatalog from './articles-catalog.vue'
import HomeDashboard from './home-dashboard.vue'
import PageProgressSelector from '../../../components/common/page-progress-selector.vue'
import VnStars from '../../../components/common/vn-stars.vue'
import { levelName } from '../../../modules/levels'
import { isProgressExcluded, NO_PROGRESS_TAG } from '../../../modules/progress'
import { DONE_STATUS, pickRoadmap, touchRoadmap } from '../../../modules/roadmap-context'
import { fitWide } from '../../../modules/fit-wide'
import { wrapByline } from '../../../modules/byline'
import { registerCodeFold } from '../../../modules/code-fold'
import { startAutoProgress } from '../../../modules/progress/auto-progress'
import { notifyStatus } from '../../../modules/progress/notify-status'
import Prism from 'prismjs'
import mermaid from 'mermaid'
import { get, sync } from 'vuex-pathify'
import _ from 'lodash'
import ClipboardJS from 'clipboard'
import Vue from 'vue'

Vue.component('Tabset', Tabset)

// -> 'hidden' when the reader closed the rail; it stays closed on the next pages
const RAIL_PREF_KEY = 'vnRailHidden'
// -> 'hidden' when the reader closed the TOC column
const TOC_PREF_KEY = 'vnTocHidden'

Prism.plugins.autoloader.languages_path = '/_assets/js/prism/'
Prism.plugins.NormalizeWhitespace.setDefaults({
  'remove-trailing': true,
  'remove-indent': true,
  'left-trim': true,
  'right-trim': true,
  'remove-initial-line-feed': true,
  'tabs-to-spaces': 2
})
// -> Prism's own copy plugin is not loaded (.babelrc), so this button and its labels apply
Prism.plugins.toolbar.registerButton('copy-to-clipboard', (env) => {
  const t = (key, fallback) => window.WIKI ? window.WIKI.$t(`common:page.${key}`, fallback) : fallback
  let linkCopy = document.createElement('button')
  linkCopy.textContent = t('copyCode', 'Sao chép')

  const clip = new ClipboardJS(linkCopy, {
    text: () => { return env.code }
  })

  clip.on('success', () => {
    linkCopy.textContent = t('copyCodeDone', 'Đã chép')
    resetClipboardText()
  })
  clip.on('error', () => {
    linkCopy.textContent = t('copyCodeError', 'Nhấn Ctrl+C để chép')
    resetClipboardText()
  })

  return linkCopy

  function resetClipboardText() {
    setTimeout(() => {
      linkCopy.textContent = t('copyCode', 'Sao chép')
    }, 5000)
  }
})
registerCodeFold()

export default {
  components: {
    ArticlesCatalog,
    HomeDashboard,
    NavSidebar,
    NavRoadmap,
    PageProgressSelector,
    VnStars
  },
  props: {
    pageId: {
      type: Number,
      default: 0
    },
    locale: {
      type: String,
      default: 'en'
    },
    path: {
      type: String,
      default: 'home'
    },
    title: {
      type: String,
      default: 'Untitled Page'
    },
    description: {
      type: String,
      default: ''
    },
    createdAt: {
      type: String,
      default: ''
    },
    updatedAt: {
      type: String,
      default: ''
    },
    tags: {
      type: Array,
      default: () => ([])
    },
    authorName: {
      type: String,
      default: 'Unknown'
    },
    authorId: {
      type: Number,
      default: 0
    },
    editor: {
      type: String,
      default: ''
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    toc: {
      type: String,
      default: ''
    },
    sidebar: {
      type: String,
      default: ''
    },
    // -> Roadmaps containing this page (base64 JSON)
    roadmaps: {
      type: String,
      default: ''
    },
    // -> Set on the article list page only (server/helpers/catalog.js)
    catalog: {
      type: String,
      default: ''
    },
    // -> Set on the Home page only (server/helpers/catalog.js)
    home: {
      type: String,
      default: ''
    },
    // -> Set on an article that the catalogue lists (server/helpers/catalog.js)
    article: {
      type: String,
      default: ''
    },
    navMode: {
      type: String,
      default: 'MIXED'
    },
    commentsEnabled: {
      type: Boolean,
      default: false
    },
    effectivePermissions: {
      type: String,
      default: ''
    },
    commentsExternal: {
      type: Boolean,
      default: false
    },
    editShortcuts: {
      type: String,
      default: ''
    },
    filename: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      currentRoadmapId: null,
      railHidden: false,
      tocHidden: false,
      railSheet: false,
      // -> true: the rail shows the site navigation instead of the roadmap
      railMenu: false,
      upBtnShown: false,
      tocSheet: false,
      lightbox: false,
      lightboxImg: null,
      activeAnchor: '',
      pageEditFab: false,
      scrollOpts: {
        duration: 0,
        offset: 16,
        easing: 'easeInOutCubic'
      }
    }
  },
  computed: {
    // -> Pages tagged `no-progress` (home, index pages...) get no progress tracker
    progressExcluded () {
      return isProgressExcluded(this.tags)
    },
    // -> A default keeps the label right while the browser still caches old translations
    commentsLabel () {
      return this.$t('common:comments.count', { count: this.commentsCount, defaultValue: '{{count}} bình luận' })
    },
    readbarOn () {
      return !this.printView && ((this.hasToc && this.tocOn) || this.railAvailable)
    },
    // -> Articles only: Home and the catalogue are not something to read through
    autoProgressOn () {
      return this.$progress.isEnabled && this.pageId > 0 && !this.progressExcluded && !this.homeDecoded && !this.catalogDecoded
    },
    // -> The progress opt-out tag is a setting, not a topic: hide it from readers
    visibleTags () {
      return this.tags.filter(t => t.tag !== NO_PROGRESS_TAG)
    },
    commentsPerms: get('page/effectivePermissions@comments'),
    commentsCount: get('page/commentsCount'),
    editShortcutsObj: get('page/editShortcuts'),
    breadcrumbs() {
      const home = { path: '/', name: this.$t('common:header.home', 'Trang chủ') }
      // -> A catalogue article: its topic, which opens the catalogue on that topic
      if (this.articleDecoded) {
        const group = this.articleDecoded.group
        return [home, { path: `/${this.locale}/articles?topic=${encodeURIComponent(group.filter)}`, name: group.name }]
      }
      return [home].concat(_.reduce(this.path.split('/'), (result, value, key) => {
        result.push({
          path: _.get(_.last(result), 'path', `/${this.locale}`) + `/${value}`,
          name: value
        })
        return result
      }, []))
    },
    pageUrl () { return window.location.href },
    sidebarDecoded () {
      return JSON.parse(Buffer.from(this.sidebar, 'base64').toString())
    },
    roadmapsDecoded () {
      try {
        return this.roadmaps ? JSON.parse(Buffer.from(this.roadmaps, 'base64').toString()) : []
      } catch (err) {
        return []
      }
    },
    catalogDecoded () {
      if (!this.catalog) { return null }
      try {
        return JSON.parse(Buffer.from(this.catalog, 'base64').toString())
      } catch (err) {
        return null
      }
    },
    homeDecoded () {
      if (!this.home) { return null }
      try {
        return JSON.parse(Buffer.from(this.home, 'base64').toString())
      } catch (err) {
        return null
      }
    },
    articleDecoded () {
      if (!this.article) { return null }
      try {
        return JSON.parse(Buffer.from(this.article, 'base64').toString())
      } catch (err) {
        return null
      }
    },
    levelLabel () {
      return levelName(this.$t.bind(this), this.articleDecoded.stars)
    },
    // -> The catalogue topics in the shape of a roadmap, for the rail
    topicRoadmap () {
      if (!this.articleDecoded || this.articleDecoded.topics.length < 1) { return null }
      return {
        id: null,
        title: this.$t('common:catalog.title', 'Bài viết'),
        href: `/${this.locale}/articles`,
        sections: this.articleDecoded.topics.map((t, i) => ({
          id: `t${i}`,
          title: t.name,
          nodes: t.items.map(it => ({ id: it.pageId, title: it.title, pageId: it.pageId, articlePath: `${this.locale}/${it.path}` }))
        }))
      }
    },
    railRoadmap () {
      return this.currentRoadmap || this.topicRoadmap
    },
    currentRoadmap () {
      return _.find(this.roadmapsDecoded, ['id', this.currentRoadmapId]) || null
    },
    railAvailable () {
      if (this.catalogDecoded || this.homeDecoded) { return false }
      return !!this.railRoadmap || this.navMode !== 'NONE'
    },
    railShown () {
      return this.railAvailable && !this.railHidden
    },
    railFolded () {
      return this.railAvailable && this.railHidden && !this.printView
    },
    tocFolded () {
      return this.tocHidden && this.hasToc && this.tocOn && !this.printView
    },
    tocDecoded () {
      try {
        return JSON.parse(Buffer.from(this.toc, 'base64').toString())
      } catch (err) {
        return []
      }
    },
    // -> Two levels, as one list: level-2 items get an indent
    tocFlat () {
      return _.flatMap(this.tocDecoded, item => [
        { anchor: item.anchor, title: item.title, sub: false },
        ..._.map(item.children || [], child => ({ anchor: child.anchor, title: child.title, sub: true }))
      ])
    },
    // -> One heading is no table of contents
    hasToc () {
      return !this.catalogDecoded && !this.homeDecoded && this.tocFlat.length > 1
    },
    // -> Previous and next article in the roadmap order, else in the order of the page's
    //    catalogue topic. Nodes without an article are skipped.
    seqArticles () {
      const toLinks = nodes => nodes
        .filter(n => n.articlePath)
        .map(n => ({ path: n.articlePath, href: '/' + n.articlePath, title: n.pageTitle || n.title }))
      if (this.currentRoadmap) {
        const list = toLinks(_.flatMap(this.currentRoadmap.sections, 'nodes'))
        if (_.some(list, ['path', this.articlePath])) { return list }
      }
      if (!this.topicRoadmap) { return [] }
      const section = _.find(this.topicRoadmap.sections, s => _.some(s.nodes, ['articlePath', this.articlePath]))
      return section ? toLinks(section.nodes) : []
    },
    articlePath () {
      return `${this.locale}/${this.path}`
    },
    seqIndex () {
      return _.findIndex(this.seqArticles, ['path', this.articlePath])
    },
    prevNode () {
      return this.seqIndex > 0 ? this.seqArticles[this.seqIndex - 1] : null
    },
    nextNode () {
      return this.seqIndex >= 0 ? (this.seqArticles[this.seqIndex + 1] || null) : null
    },
    tocPosition: get('site/tocPosition'),
    // -> The admin can turn the table of contents off. "left" and "right" both show it on the right.
    tocOn () {
      return this.tocPosition !== 'off'
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
    },
    printView: sync('site/printView'),
    editMenuExternalUrl () {
      if (this.editShortcutsObj.editMenuBar && this.editShortcutsObj.editMenuExternalBtn) {
        return this.editShortcutsObj.editMenuExternalUrl.replace('{filename}', this.filename)
      } else {
        return ''
      }
    }
  },
  created() {
    this.$store.set('page/authorId', this.authorId)
    this.$store.set('page/authorName', this.authorName)
    this.$store.set('page/createdAt', this.createdAt)
    this.$store.set('page/description', this.description)
    this.$store.set('page/isPublished', this.isPublished)
    this.$store.set('page/id', this.pageId)
    this.$store.set('page/locale', this.locale)
    this.$store.set('page/path', this.path)
    this.$store.set('page/tags', this.tags)
    this.$store.set('page/title', this.title)
    this.$store.set('page/editor', this.editor)
    this.$store.set('page/updatedAt', this.updatedAt)
    if (this.effectivePermissions) {
      this.$store.set('page/effectivePermissions', JSON.parse(Buffer.from(this.effectivePermissions, 'base64').toString()))
    }
    if (this.editShortcuts) {
      this.$store.set('page/editShortcuts', JSON.parse(Buffer.from(this.editShortcuts, 'base64').toString()))
    }

    this.$store.set('page/mode', 'view')

    // -> Roadmap sidebar: the roadmap the reader came from or used last
    const roadmap = pickRoadmap(this.roadmapsDecoded)
    if (roadmap) {
      this.currentRoadmapId = roadmap.id
      touchRoadmap(roadmap.id)
    }
    try {
      this.railHidden = window.localStorage.getItem(RAIL_PREF_KEY) === 'hidden'
      this.tocHidden = window.localStorage.getItem(TOC_PREF_KEY) === 'hidden'
    } catch (err) {}

    // -> Keep this page's stored path current if it has been renamed or moved. A no-op
    //    (and no storage write) unless the reader has actually tracked this page.
    this.$progress.recordVisit({
      pageId: this.pageId,
      locale: this.locale,
      path: this.path,
      title: this.title
    })
  },
  watch: {
    // -> The sheet mounts its content at the first open, before it has a height:
    //    scroll to the current page each time the sheet shows
    railSheet (open) {
      if (!open) { return }
      setTimeout(() => {
        if (this.$refs.sheetRoadmap) { this.$refs.sheetRoadmap.scrollToCurrent() }
      }, 0)
    }
  },
  mounted () {
    // -> The catalogue shows no page contents
    if (this.catalogDecoded) {
      window.boot.notify('page-ready')
      return
    }

    // -> The author lines at the top show as one card
    wrapByline(this.$refs.container)

    // -> Highlight Code Blocks
    Prism.highlightAllUnder(this.$refs.container)

    // -> Render Mermaid diagrams
    mermaid.mermaidAPI.initialize({
      startOnLoad: true,
      theme: this.$vuetify.theme.dark ? `dark` : `default`
    })

    // -> Handle anchor scrolling
    if (window.location.hash && window.location.hash.length > 1) {
      if (document.readyState === 'complete') {
        this.$nextTick(() => {
          this.$vuetify.goTo(decodeURIComponent(window.location.hash), this.scrollOpts)
        })
      } else {
        window.addEventListener('load', () => {
          this.$vuetify.goTo(decodeURIComponent(window.location.hash), this.scrollOpts)
        })
      }
    }

    // -> Handle anchor links within the page contents
    this.$nextTick(() => {
      this.$refs.container.querySelectorAll(`a[href^="#"], a[href^="${window.location.href.replace(window.location.hash, '')}#"]`).forEach(el => {
        el.onclick = ev => {
          ev.preventDefault()
          ev.stopPropagation()
          const href = decodeURIComponent(ev.currentTarget.hash ?? ev.currentTarget.href?.baseVal ?? '')

          // mjx component is an SVG element, which is not a valid target for goTo
          // so we need to find the nearest parent element that is an HTMLElement
          if (href.startsWith('#mjx-')) {
            let target = document.getElementById(href.replace('#', ''))
            while (target && !(target instanceof HTMLElement)) {
              target = target.parentNode
            }
            return this.$vuetify.goTo(target, this.scrollOpts)
          }

          if (href.startsWith('#ktx-') || href.match(/^#\d/)) {
            return this.$vuetify.goTo(document.getElementById(href.replace('#', '')), this.scrollOpts)
          }

          this.$vuetify.goTo(href, this.scrollOpts)
        }
      })

      // -> Mark links to pages the reader has tracked. Re-runs on every status change
      //    (including changes made in another tab) until the component is destroyed.
      this.progressTeardown = this.$progress.decorate(this.$refs.container)

      this.watchHeadings()

      // -> A formula or table wider than the column scrolls inside itself, not the page
      this.fitTeardown = fitWide(this.$refs.container)

      // -> "Đang đọc" after a short look, "Hoàn thành" at the end of the text
      if (this.autoProgressOn) {
        this.autoTeardown = startAutoProgress({
          progress: this.$progress,
          pageId: this.pageId,
          meta: { locale: this.locale, path: this.path, title: this.title },
          content: this.$refs.container,
          onDone: () => notifyStatus(this, this.$progress.registry.resolve(DONE_STATUS))
        })
        // -> One layout read per frame
        let queued = false
        this.onReadProg = () => {
          if (queued) { return }
          queued = true
          window.requestAnimationFrame(() => {
            queued = false
            const bar = this.$refs.readProg
            if (!bar) { return }
            const box = this.$refs.container.getBoundingClientRect()
            const share = -box.top / Math.max(1, box.height - window.innerHeight)
            bar.style.transform = `scaleX(${Math.min(1, Math.max(0, share))})`
          })
        }
        window.addEventListener('scroll', this.onReadProg, { passive: true })
        window.addEventListener('resize', this.onReadProg, { passive: true })
        this.onReadProg()
      }

      // -> The back-to-top button shows after a third of a screen
      this.onScrollTop = () => {
        this.upBtnShown = window.pageYOffset > window.innerHeight / 3
      }
      window.addEventListener('scroll', this.onScrollTop, { passive: true })
      // -> The browser can restore the scroll position before the listener starts
      this.onScrollTop()

      window.boot.notify('page-ready')
    })
  },
  beforeDestroy () {
    if (this.progressTeardown) { this.progressTeardown() }
    if (this.fitTeardown) { this.fitTeardown() }
    if (this.autoTeardown) { this.autoTeardown() }
    if (this.onReadProg) {
      window.removeEventListener('scroll', this.onReadProg)
      window.removeEventListener('resize', this.onReadProg)
    }
    if (this.onScrollSpy) { window.removeEventListener('scroll', this.onScrollSpy) }
    if (this.onScrollTop) { window.removeEventListener('scroll', this.onScrollTop) }
  },
  methods: {
    selectRoadmap (roadmap) {
      this.currentRoadmapId = roadmap.id
      touchRoadmap(roadmap.id)
    },
    setRailHidden (hidden) {
      this.keepReadingPlace(() => { this.railHidden = hidden })
      try {
        window.localStorage.setItem(RAIL_PREF_KEY, hidden ? 'hidden' : 'shown')
      } catch (err) {}
    },
    setTocHidden (hidden) {
      this.keepReadingPlace(() => { this.tocHidden = hidden })
      try {
        window.localStorage.setItem(TOC_PREF_KEY, hidden ? 'hidden' : 'shown')
      } catch (err) {}
    },
    // -> A mouse click closes the folded TOC panel. Keyboard focus keeps it open.
    onFoldLink (ev, anchor) {
      if (ev.detail > 0) { ev.currentTarget.blur() }
      this.goToAnchor(anchor)
    },
    // -> The text column changes width, so keep the first visible block at the same place
    keepReadingPlace (change) {
      const bar = document.querySelector('.vn-topbar')
      const topLine = bar ? bar.getBoundingClientRect().bottom : 0
      const anchor = _.find(this.$refs.container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, table, .katex-display'), el => el.getBoundingClientRect().bottom > topLine)
      const offset = anchor ? anchor.getBoundingClientRect().top : 0
      change()
      if (anchor) {
        this.$nextTick(() => {
          window.scrollBy(0, anchor.getBoundingClientRect().top - offset)
        })
      }
    },
    // -> An image opens at full size, unless it is a link
    openImage (e) {
      const img = e.target.closest('img')
      if (!img || img.closest('a')) { return }
      this.lightboxImg = { src: img.currentSrc || img.src, alt: img.alt }
      this.lightbox = true
    },
    goToAnchor (anchor) {
      // -> The clicked entry stays active until the reader scrolls: a short section can
      //    end with its next heading above the line that the scroll spy uses
      this.spyHold = true
      this.activeAnchor = anchor
      const release = () => { this.spyHold = false }
      Promise.resolve(this.$vuetify.goTo(decodeURIComponent(anchor), this.scrollOpts)).catch(() => {}).then(() => {
        ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(ev => window.addEventListener(ev, release, { once: true, passive: true }))
      })
      window.history.replaceState(null, '', anchor)
    },
    /**
     * Mark the TOC entry of the heading the reader is at: the last heading above the top third.
     */
    watchHeadings () {
      if (!this.hasToc) { return }
      const heads = this.tocFlat
        .map(item => document.getElementById(decodeURIComponent(item.anchor).replace(/^#/, '')))
        .filter(Boolean)
      if (heads.length < 1) { return }
      const pick = () => {
        if (this.spyHold) { return }
        const limit = window.innerHeight / 3
        let current = heads[0]
        for (const h of heads) {
          if (h.getBoundingClientRect().top <= limit) { current = h } else { break }
        }
        this.activeAnchor = '#' + current.id
      }
      // -> A scroll listener, not an IntersectionObserver: a long jump (TOC click, anchor
      //    link) can skip every intersection change
      let queued = false
      this.onScrollSpy = () => {
        if (queued) { return }
        queued = true
        window.requestAnimationFrame(() => { queued = false; pick() })
      }
      window.addEventListener('scroll', this.onScrollSpy, { passive: true })
      pick()
    },
    print () {
      if (this.printView) {
        this.printView = false
      } else {
        this.printView = true
        this.$nextTick(() => {
          window.print()
        })
      }
    },
    pageEdit () {
      this.$root.$emit('pageEdit')
    },
    pageHistory () {
      this.$root.$emit('pageHistory')
    },
    pageSource () {
      this.$root.$emit('pageSource')
    },
    pageConvert () {
      this.$root.$emit('pageConvert')
    },
    pageDuplicate () {
      this.$root.$emit('pageDuplicate')
    },
    pageMove () {
      this.$root.$emit('pageMove')
    },
    pageDelete () {
      this.$root.$emit('pageDelete')
    },
    goToComments (focusNewComment = false) {
      this.$vuetify.goTo('#discussion', this.scrollOpts)
      if (focusNewComment) {
        document.querySelector('#discussion-new').focus()
      }
    }
  }
}
</script>

<style lang="scss">

// ---------------------------------
// ARTICLE LAYOUT: rail | text | TOC
// ---------------------------------
// Three columns above 1220px. From 901 to 1220px the TOC moves to the bottom bar.
// At 900px and below, the rail moves to the bottom bar too.
// A hidden rail leaves a column with one button. A hidden TOC folds to a column of ticks.
// With both hidden on a wide screen, a right padding keeps the text in the center.

.vn-doc {
  --rail-w: 15rem;
  --toc-w: 13rem;
  --fold-w: 2.5rem;
  --railbtn-w: 10rem;
  display: grid;
  grid-template-columns: minmax(0, var(--read)) var(--toc-w);
  justify-content: center;
  gap: 32px;
  align-items: start;
  padding: 28px 20px 64px;

  &.has-rail {
    grid-template-columns: var(--rail-w) minmax(0, var(--read)) var(--toc-w);
  }

  &.rail-folded {
    grid-template-columns: var(--railbtn-w) minmax(0, var(--read)) var(--toc-w);
  }

  &.toc-folded {
    --toc-w: var(--fold-w);
  }

  // -> Home: the page contents start at the left edge of the dashboard
  &.is-home {
    grid-template-columns: minmax(0, var(--read));
    justify-content: start;
    max-width: var(--wrap);
    margin-inline: auto;
    padding-top: 8px;
  }
}

.vn-rail, .vn-toc:not(.is-sheet) {
  position: sticky;
  top: calc(var(--topbar-h) + 16px);
  max-height: calc(100vh - var(--topbar-h) - 32px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &:hover {
    scrollbar-color: var(--line) transparent;
  }
}

.vn-rail {
  padding-right: 4px;
}

.vn-railfold, .vn-tocfold {
  position: sticky;
  top: calc(var(--topbar-h) + 16px);
}

.vn-article {
  min-width: 0;
}

.vn-crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 0.875rem;
  color: var(--muted);

  a {
    padding-block: 3px;
    color: var(--muted) !important;
    text-decoration: none !important;

    &:hover {
      color: var(--ink) !important;
    }
  }

  span[aria-hidden] {
    opacity: 0.6;
  }
}

.vn-unpub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid var(--mark-red);
  border-radius: 8px;
  color: var(--mark-red);
  font-size: 0.875rem;

  .v-icon {
    color: var(--mark-red) !important;
  }
}

.vn-title {
  margin: 0;
  font-size: clamp(1.75rem, 3.4vw, 2.35rem);
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--ink);
  text-wrap: balance;
}

.vn-desc {
  margin: 8px 0 0 !important;
  color: var(--muted);
}

.vn-meta {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  align-items: center;
  font-size: 0.875rem;
  color: var(--muted);
}

.vn-meta__level {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ink);
  font-weight: 500;

  .vn-stars i {
    width: 9px;
    height: 9px;
  }
}

.vn-linkbtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  color: var(--accent) !important;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none !important;

  &:hover {
    text-decoration: underline !important;
    text-underline-offset: 3px;
  }

  .v-icon {
    color: inherit !important;
  }
}

.vn-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;

  .v-icon {
    color: inherit !important;
  }
}

// -> Back from the roadmap's site navigation to the roadmap
.vn-railback {
  display: block;
  width: 100%;
  margin-bottom: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 600;
  text-align: left;

  &:hover {
    background: var(--sunken);
  }
}

// -> Article images open at full size (not those in a link)
.vn-article .contents img {
  cursor: zoom-in;
}

.vn-article .contents a img {
  cursor: pointer;
}

.v-dialog.vn-lightbox {
  width: auto;
  max-height: calc(100vh - 48px);
  box-shadow: none;
  overflow: visible;

  img {
    display: block;
    max-width: calc(100vw - 48px);
    max-height: calc(100vh - 48px);
    border-radius: 8px;
    // -> Most figures are drawn for a white page
    background: #fff;
    cursor: zoom-out;
  }
}

.vn-readprog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 7;
  height: 3px;
  pointer-events: none;

  i {
    display: block;
    height: 100%;
    background: var(--accent);
    transform: scaleX(0);
    transform-origin: left;
  }
}

.vn-printbar {
  max-width: var(--read);
  margin: 16px auto 0;
  padding-inline: 20px;
}

.vn-totop {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 6;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow);

  .v-icon {
    color: var(--ink) !important;
  }

  &:hover {
    border-color: var(--accent);
  }

  // -> Above the edit button
  &.has-fab {
    right: 26px;
    bottom: 92px;
  }

  // -> Above the bottom bar, which shows at these widths
  @media (max-width: 1220px) {
    bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  }
}

.vn-tag {
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted) !important;
  font-size: 0.8125rem;
  text-decoration: none !important;

  &:hover {
    border-color: var(--accent);
    color: var(--ink) !important;
  }
}

.vn-nextprev {
  margin-top: 36px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  a {
    display: grid;
    gap: 4px;
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    color: var(--ink) !important;
    text-decoration: none !important;

    &:hover {
      border-color: var(--accent);
    }

    &.is-next {
      text-align: right;
    }
  }

  b {
    font-weight: 600;
  }
}

.vn-nextprev__k {
  font-size: 0.8125rem;
  color: var(--muted);
}

.vn-comments {
  margin-top: 36px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
  scroll-margin-top: calc(var(--topbar-h) + 24px);

  h2 {
    margin: 0 0 16px;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--ink);
  }
}

.vn-comments__n {
  margin-left: 6px;
  font: 500 0.875rem var(--font-mono);
  color: var(--muted);
}

// ---------------------------------
// TABLE OF CONTENTS
// ---------------------------------

.vn-toc {
  display: grid;
  gap: 4px;
  align-content: start;

  > a {
    display: block;
    padding: 4px 0 4px 12px;
    border-left: 2px solid var(--line);
    color: var(--muted) !important;
    font-size: 0.875rem;
    line-height: 1.4;
    text-decoration: none !important;

    &.is-sub {
      padding-left: 24px;
      font-size: 0.8125rem;
    }

    &:hover {
      color: var(--ink) !important;
    }

    &.is-active {
      color: var(--accent) !important;
      border-left-color: var(--accent);
      font-weight: 500;
    }
  }
}

.vn-toc__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  .vn-label {
    margin-bottom: 0;
  }
}

// -> Same look as the roadmap hide button
.vn-toc__hide {
  flex: none;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: var(--muted) !important;
  font-size: 1.125rem;

  .v-icon {
    color: inherit !important;
  }

  &:hover {
    background: var(--sunken);
    color: var(--ink) !important;
  }
}

// -> The folded TOC: one tick per heading at the right edge of the page
.vn-tocfold {
  justify-self: end;
  padding: 8px 0 8px 12px;
}

.vn-tocfold__ticks {
  display: grid;
  justify-items: end;
  gap: 8px;
  max-height: 60vh;
  overflow: hidden;

  i {
    width: 16px;
    height: 2px;
    border-radius: 1px;
    background: color-mix(in srgb, var(--muted) 80%, transparent);

    &.is-sub {
      width: 10px;
    }

    &.is-active {
      background: var(--accent);
    }
  }
}

// -> Opacity, not visibility: a hidden link must still take keyboard focus.
//    `.vn-toc` is in the selector to beat the sticky rule of the TOC column.
.vn-tocfold__panel.vn-toc {
  position: absolute;
  top: 0;
  right: 0;
  width: 18rem;
  max-height: calc(100vh - var(--topbar-h) - 48px);
  overflow-y: auto;
  padding: 12px 12px 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
  opacity: 0;
  transform: translateX(8px);
  pointer-events: none;
  transition: opacity 0.15s, transform 0.15s;

  .vn-tocfold:hover &, .vn-tocfold:focus-within & {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
}

.vn-toc__tools {
  margin-top: 16px;
  display: grid;
  justify-items: start;
  gap: 8px;
}

// -> Shown only where the TOC column is hidden (see the media rules below)
.vn-endtools {
  display: none;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 24px;
}

// ---------------------------------
// BOTTOM BAR
// ---------------------------------
// 901-1220px: a TOC pill, because the TOC column does not fit beside the rail.
// 900px and below: one bar with both buttons, the rail on the left.
// Above 900px, a hidden rail leaves its own pill at the bottom left.

.vn-readbar {
  display: none;
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 5;
  gap: 8px;
}

.vn-readbar button, .vn-railopen {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  box-shadow: var(--shadow);
  color: var(--ink);
  font-weight: 600;
  font-size: 0.9375rem;

  .v-icon {
    color: var(--muted) !important;
  }
}

.vn-railopen {
  position: fixed;
  left: 20px;
  top: calc(var(--topbar-h) + 16px);
  z-index: 4;
  padding: 8px 12px;
  box-shadow: none;
  font-size: 0.875rem;
  white-space: nowrap;

  &:hover {
    border-color: var(--muted);
  }
}

@media (min-width: 1221px) {
  .vn-doc.rail-folded.toc-folded {
    padding-right: calc(20px + var(--railbtn-w) - var(--fold-w));
  }
}

// -> A folded TOC has no page tools: they move to the article end
.vn-doc.toc-folded .vn-endtools {
  display: flex;
}

@media (max-width: 1220px) {
  .vn-doc.has-rail {
    grid-template-columns: var(--rail-w) minmax(0, var(--read));
  }

  // -> The TOC moves to the bottom bar, beside a shown or a folded rail
  .vn-doc.rail-folded {
    grid-template-columns: var(--railbtn-w) minmax(0, var(--read));
  }

  .vn-doc.has-rail, .vn-doc.rail-folded {
    > .vn-toc, > .vn-tocfold {
      display: none;
    }

    .vn-endtools {
      display: flex;
    }

    ~ .vn-readbar {
      display: flex;

      button.is-rail {
        display: none;
      }
    }
  }
}

@media (max-width: 900px) {
  // -> The edit button and the back-to-top button stay above the bottom bar
  .vn-readbar ~ .v-speed-dial--fixed {
    bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  }

  .vn-totop.has-fab.has-bar {
    bottom: calc(152px + env(safe-area-inset-bottom, 0px));
  }

  .vn-doc, .vn-doc.has-rail, .vn-doc.rail-folded {
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: 96px;

    > .vn-rail, > .vn-toc, > .vn-railfold, > .vn-tocfold {
      display: none;
    }

    .vn-endtools {
      display: flex;
    }
  }

  .vn-readbar, .vn-doc.has-rail ~ .vn-readbar, .vn-doc.rail-folded ~ .vn-readbar {
    display: flex;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
    background: var(--surface);
    border-top: 1px solid var(--line);

    button, button.is-toc, button.is-rail {
      display: inline-flex;
      flex: 1;
      justify-content: center;
      min-width: 0;
      border-radius: 8px;
      box-shadow: none;

      span {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }
}

@media (max-width: 560px) {
  .vn-nextprev {
    grid-template-columns: 1fr;

    a.is-next {
      text-align: left;
    }
  }
}

.vn-sheet .vn-toc.is-sheet {
  max-height: 60vh;
  overflow-y: auto;
}

</style>
