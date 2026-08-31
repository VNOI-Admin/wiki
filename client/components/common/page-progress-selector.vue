<template lang="pug">
  component(
    v-if='isEnabled'
    :is='variant === `card` ? `v-card` : `div`'
    :class='[`page-progress`, `is-` + variant, variant === `card` ? `page-progress-card mb-5` : ``]'
    )
    .page-progress-inner
      .overline.pb-2.deep-purple--text(
        v-if='variant === `card`'
        :class='$vuetify.theme.dark ? `text--lighten-3` : ``'
        ) {{ headingText }}
      .page-progress-prompt(v-if='variant === `block`')
        .subtitle-2 {{ headingText }}
        .caption.grey--text {{ $t('common:progress.savedLocally', 'Saved in this browser only.') }}

      v-menu(offset-y, bottom, min-width='220', :left='variant !== `card`')
        template(v-slot:activator='{ on: menu }')
          v-btn.text-none.px-3.page-progress-btn(
            v-on='menu'
            v-bind='buttonSize'
            outlined
            :block='variant === `card`'
            :color='currentStatus.color'
            :aria-label='$t(`common:progress.statusAria`, { defaultValue: `Progress: {{status}}`, status: currentStatus.label })'
            )
            v-icon(left, v-bind='iconSize') {{ currentStatus.icon }}
            span.page-progress-label {{ currentStatus.label }}
            v-spacer(v-if='variant === `card`')
            v-icon(right, v-bind='iconSize') mdi-menu-down
        v-list(dense, nav)
          v-list-item(
            v-for='status of statuses'
            :key='status.id'
            @click='setStatus(status.id)'
            :input-value='status.id === currentStatus.id'
            )
            v-list-item-icon.mr-3
              v-icon(:color='status.color', small) {{ status.icon }}
            v-list-item-title {{ status.label }}

      .page-progress-actions(v-if='showDataLink')
        v-btn.text-none.px-1(@click='dialogData = true', text, x-small, color='grey')
          v-icon(left, x-small) mdi-database-cog-outline
          span {{ $t('common:progress.manageData', 'Manage data') }}
        v-tooltip(bottom, v-if='!isPersistent')
          template(v-slot:activator='{ on }')
            v-icon.ml-2(v-on='on', color='orange', x-small) mdi-alert-outline
          span {{ $t('common:progress.notPersistent', 'Progress cannot be saved in this browser') }}

    progress-data-dialog(v-if='showDataLink', v-model='dialogData')
</template>

<script>
import { VCard } from 'vuetify/lib'
import ProgressDataDialog from './progress-data-dialog.vue'

/**
 * Per-article progress selector.
 *
 * Presentation only: all state lives in `this.$progress` (ProgressManager), which is the
 * single source of truth and the only thing that knows about storage.
 *
 * Rendered in three places on an article, hence the variants:
 *   card   sidebar column (hidden below the `lg` breakpoint)
 *   inline beside the page title, compact
 *   block  below the page content, with a prompt
 */
export default {
  components: {
    // -> vuetify-loader auto-imports components it can find in the template, but the
    //    root element here is a dynamic `:is`, which it cannot analyse statically.
    VCard,
    ProgressDataDialog
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
      default: ''
    },
    title: {
      type: String,
      default: ''
    },
    variant: {
      type: String,
      default: 'card',
      validator: v => ['card', 'inline', 'block'].includes(v)
    }
  },
  data () {
    return {
      dialogData: false
    }
  },
  computed: {
    isEnabled () {
      return this.$progress.isEnabled === true && this.pageId > 0
    },
    isPersistent () {
      return this.$progress.isPersistent
    },
    headingText () {
      if (this.variant === 'block') {
        return this.$t('common:progress.blockHeading', 'Mark your progress on this page')
      }
      return this.$t('common:progress.title', 'Progress')
    },
    /**
     * The sidebar card is hidden below the `lg` breakpoint, so the bottom block has to
     * carry the data controls too — otherwise import/export is unreachable on mobile.
     */
    showDataLink () {
      return this.variant === 'card' || this.variant === 'block'
    },
    /**
     * The inline variant sits beside the page title as the primary control, so it runs
     * at full size. The card and block variants are secondary and stay small.
     */
    buttonSize () {
      return this.variant === 'inline' ? {} : { small: true }
    },
    iconSize () {
      return this.variant === 'inline' ? {} : { small: true }
    },
    statuses () {
      return this.$progress.registry.list()
    },
    currentStatus () {
      // -> Reads the observable manager state, so this recomputes on every change,
      //    including writes made in another tab.
      return this.$progress.getStatusByPageId(this.pageId)
    }
  },
  methods: {
    setStatus (statusId) {
      this.$progress.setStatus(this.pageId, statusId, {
        locale: this.locale,
        path: this.path,
        title: this.title
      })
    }
  }
}
</script>

<style lang="scss">
.page-progress {
  &.is-card > .page-progress-inner {
    padding: 20px;
  }

  &.is-block {
    margin-top: 32px;
    border: 1px solid mc('grey', '300');
    border-radius: 7px;

    @at-root .theme--dark & {
      border-color: mc('grey', '800');
    }

    > .page-progress-inner {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 16px;
      padding: 12px 16px;
    }

    .page-progress-prompt {
      flex: 1 1 auto;
      min-width: 0;
    }

    .page-progress-actions {
      margin-left: auto;
    }
  }

  &.is-inline {
    flex: 0 0 auto;
    margin-left: 24px;

    .page-progress-btn {
      font-size: 0.9375rem;
      letter-spacing: normal;
    }

    // -> Narrow screens: drop to an icon-only button rather than squeezing the title
    @media (max-width: 599px) {
      margin-left: 12px;

      .page-progress-label {
        display: none;
      }
    }
  }

  &.is-card .page-progress-actions {
    display: flex;
    align-items: center;
    margin-top: 8px;
  }
}

// -> Progress is a per-reader annotation, not part of the document
@media print {
  .page-progress {
    display: none !important;
  }
}
</style>
