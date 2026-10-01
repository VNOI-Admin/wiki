<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-triangle-arrow.svg', alt='Header Links', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft {{ $t('admin:headerLinks.title', 'Header Links') }}
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s {{ $t('admin:headerLinks.subtitle', 'Links shown in the top navigation bar') }}
          v-spacer
          v-btn.mx-3.animated.fadeInDown.wait-p2s(icon, outlined, color='grey', @click='refresh')
            v-icon mdi-refresh
          v-btn.animated.fadeInDown(color='success', depressed, @click='save', large, :loading='loading')
            v-icon(left) mdi-check
            span {{ $t('common:actions.apply') }}
        v-card.mt-3.animated.fadeInUp
          v-toolbar(color='primary', dark, dense, flat)
            v-toolbar-title.subtitle-1 {{ $t('admin:headerLinks.links', 'Links') }}
            v-spacer
            v-btn.text-none(small, text, dark, @click='addLink')
              v-icon(left, small) mdi-plus
              span {{ $t('admin:headerLinks.add', 'Add link') }}
          v-card-text
            .caption.grey--text.mb-3 {{ $t('admin:headerLinks.hint', 'Links are shown from the lowest order to the highest. The URL can be a full http(s):// address or a path on this site, e.g. /en/home.') }}
            v-alert(v-if='validationError', color='red', outlined, dense, icon='mdi-alert-circle-outline')
              .caption {{ validationError }}
            v-card.mb-2(
              v-for='(link, idx) of links'
              :key='link.key'
              outlined
              )
              .d-flex.align-center.pa-2
                v-layout(row wrap, dense)
                  v-flex(xs12 sm4)
                    v-text-field.mr-2(
                      v-model='link.name'
                      :label='$t(`admin:headerLinks.fieldName`, `Name`)'
                      dense
                      outlined
                      hide-details
                      )
                  v-flex(xs12 sm6)
                    v-text-field.mr-2(
                      v-model='link.url'
                      :label='$t(`admin:headerLinks.fieldUrl`, `URL`)'
                      placeholder='https://'
                      dense
                      outlined
                      hide-details
                      )
                  v-flex(xs12 sm2)
                    v-text-field(
                      v-model.number='link.order'
                      :label='$t(`admin:headerLinks.fieldOrder`, `Order`)'
                      type='number'
                      dense
                      outlined
                      hide-details
                      )
                v-tooltip(bottom)
                  template(v-slot:activator='{ on }')
                    v-btn.ml-2(icon, small, v-on='on', @click='removeLink(idx)')
                      v-icon(color='red lighten-1', small) mdi-close
                  span {{ $t('admin:headerLinks.remove', 'Remove') }}
            .caption.grey--text(v-if='links.length < 1') {{ $t('admin:headerLinks.empty', 'No links yet. The navbar shows no extra links.') }}
</template>

<script>
import _ from 'lodash'

import headerLinksQuery from 'gql/admin/navigation/navigation-query-header-links.gql'
import headerLinksMutation from 'gql/admin/navigation/navigation-mutation-header-links.gql'

// -> Same rule as server/helpers/header-links.js
const urlRegex = /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i

let nextKey = 1

export default {
  data() {
    return {
      loading: false,
      validationError: '',
      links: []
    }
  },
  methods: {
    addLink () {
      const maxOrder = _.max(_.map(this.links, l => _.toSafeInteger(l.order)))
      this.links.push({
        key: nextKey++,
        name: '',
        url: '',
        order: _.isUndefined(maxOrder) ? 1 : maxOrder + 1
      })
    },
    removeLink (idx) {
      this.links.splice(idx, 1)
    },
    /**
     * Catch the entries the server would silently drop, so the admin sees why.
     *
     * @returns {boolean} Whether the links are safe to submit
     */
    validate () {
      this.validationError = ''
      if (_.some(this.links, l => _.isEmpty(_.trim(l.name)))) {
        this.validationError = this.$t('admin:headerLinks.errorNoName', 'Every link needs a name.')
        return false
      }
      const bad = _.find(this.links, l => !urlRegex.test(_.trim(l.url)))
      if (bad) {
        this.validationError = this.$t('admin:headerLinks.errorBadUrl', {
          defaultValue: 'The URL of "{{name}}" must start with http://, https:// or /.',
          name: _.trim(bad.name)
        })
        return false
      }
      if (_.some(this.links, l => !Number.isInteger(l.order))) {
        this.validationError = this.$t('admin:headerLinks.errorBadOrder', 'Order must be a whole number.')
        return false
      }
      return true
    },
    async save () {
      if (!this.validate()) { return }

      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-header-links-save')
      try {
        const respRaw = await this.$apollo.mutate({
          mutation: headerLinksMutation,
          variables: {
            links: this.links.map(l => ({
              name: _.trim(l.name),
              url: _.trim(l.url),
              order: l.order
            }))
          }
        })
        const resp = _.get(respRaw, 'data.navigation.updateHeaderLinks.responseResult', {})
        if (resp.succeeded) {
          this.links = _.sortBy(this.links, 'order')
          this.$store.set('site/headerLinks', this.links.map(l => _.pick(l, ['name', 'url', 'order'])))
          this.$store.commit('showNotification', {
            message: this.$t('admin:headerLinks.saveSuccess', 'Header links updated successfully.'),
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.$store.commit(`loadingStop`, 'admin-header-links-save')
      this.loading = false
    },
    async refresh () {
      await this.$apollo.queries.links.refetch()
    }
  },
  apollo: {
    links: {
      query: headerLinksQuery,
      fetchPolicy: 'network-only',
      update: (data) => _.get(data, 'navigation.headerLinks', []).map(l => ({ ...l, key: nextKey++ })),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-header-links-refresh')
      }
    }
  }
}
</script>
