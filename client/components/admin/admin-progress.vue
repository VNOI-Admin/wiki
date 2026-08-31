<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-checkmark.svg', alt='Progress Tracking', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft {{ $t('admin:progress.title', 'Progress Tracking') }}
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s {{ $t('admin:progress.subtitle', 'Let readers track which articles they have read') }}
          v-spacer
          v-btn.animated.fadeInRight(color='success', depressed, @click='save', large, :loading='loading')
            v-icon(left) mdi-check
            span {{ $t('common:actions.apply') }}
        v-form.pt-3
          v-layout(row wrap)
            v-flex(lg5 xs12)
              v-card.animated.fadeInUp
                v-toolbar(color='primary', dark, dense, flat)
                  v-toolbar-title.subtitle-1 {{ $t('admin:progress.options', 'Options') }}
                v-card-text
                  v-switch(
                    inset
                    :label='$t(`admin:progress.isEnabled`, `Enable progress tracking`)'
                    color='primary'
                    v-model='config.isEnabled'
                    persistent-hint
                    :hint='$t(`admin:progress.isEnabledHint`, `Show a progress selector on every page. Progress is stored in each reader’s browser only — never on the server.`)'
                    )
                  v-divider.mt-3
                  v-switch.mt-3(
                    inset
                    :label='$t(`admin:progress.showLinkMarkers`, `Show status markers on page links`)'
                    color='primary'
                    v-model='config.showLinkMarkers'
                    :disabled='!config.isEnabled'
                    persistent-hint
                    :hint='$t(`admin:progress.showLinkMarkersHint`, `Add a small status icon next to any link pointing at a page the reader has tracked.`)'
                    )
                v-card-text.pt-0
                  v-alert(color='blue-grey', outlined, dense, icon='mdi-information-outline')
                    .caption {{ $t('admin:progress.info', 'Progress data never leaves the reader’s browser, so disabling this feature hides it without deleting anything. Readers export and import their own data from the progress card on any page.') }}

            v-flex(lg7 xs12)
              v-card.animated.fadeInUp.wait-p2s
                v-toolbar(color='primary', dark, dense, flat)
                  v-toolbar-title.subtitle-1 {{ $t('admin:progress.statuses', 'Statuses') }}
                  v-spacer
                  v-btn.text-none(small, text, dark, @click='addStatus')
                    v-icon(left, small) mdi-plus
                    span {{ $t('admin:progress.addStatus', 'Add status') }}
                v-card-text
                  .caption.grey--text.mb-3 {{ $t('admin:progress.statusesHint', 'Drag to reorder. The status marked as default means "not started" - it is never shown as a marker on links, and pages in it are not stored.') }}
                  v-alert(v-if='validationError', color='red', outlined, dense, icon='mdi-alert-circle-outline')
                    .caption {{ validationError }}
                  draggable(v-model='config.statuses', handle='.status-drag-handle')
                    v-card.mb-2(
                      v-for='(status, idx) of config.statuses'
                      :key='`status-` + idx'
                      outlined
                      )
                      .d-flex.align-center.pa-2
                        v-icon.status-drag-handle.mr-2(color='grey') mdi-drag-horizontal-variant
                        v-icon.mr-3(:color='status.color') {{ status.icon }}
                        v-layout(row wrap, dense)
                          v-flex(xs12 sm3)
                            v-text-field.mr-2(
                              v-model='status.id'
                              :label='$t(`admin:progress.fieldId`, `ID`)'
                              dense
                              outlined
                              hide-details
                              :disabled='!isNewStatus(status)'
                              :hint='isNewStatus(status) ? `` : $t(`admin:progress.idLocked`, `Existing readers reference this ID`)'
                              )
                          v-flex(xs12 sm3)
                            v-text-field.mr-2(
                              v-model='status.label'
                              :label='$t(`admin:progress.fieldLabel`, `Label`)'
                              dense
                              outlined
                              hide-details
                              )
                          v-flex(xs12 sm3)
                            v-text-field.mr-2(
                              v-model='status.icon'
                              :label='$t(`admin:progress.fieldIcon`, `Icon`)'
                              placeholder='mdi-check-circle'
                              dense
                              outlined
                              hide-details
                              )
                          v-flex(xs12 sm3)
                            v-select(
                              v-model='status.color'
                              :items='colors'
                              :label='$t(`admin:progress.fieldColor`, `Color`)'
                              dense
                              outlined
                              hide-details
                              )
                        v-tooltip(bottom)
                          template(v-slot:activator='{ on }')
                            v-btn.ml-2(icon, small, v-on='on', @click='setDefault(idx)')
                              v-icon(:color='status.isDefault ? `primary` : `grey lighten-1`', small) {{ status.isDefault ? `mdi-radiobox-marked` : `mdi-radiobox-blank` }}
                          span {{ $t('admin:progress.setDefault', 'Use as the default ("not started") status') }}
                        v-tooltip(bottom)
                          template(v-slot:activator='{ on }')
                            v-btn(icon, small, v-on='on', @click='removeStatus(idx)', :disabled='config.statuses.length < 2')
                              v-icon(color='red lighten-1', small) mdi-close
                          span {{ $t('admin:progress.remove', 'Remove') }}
                  .caption.grey--text.mt-2(v-if='config.statuses.length < 1') {{ $t('admin:progress.empty', 'No statuses configured. Save to restore the defaults.') }}
</template>

<script>
import _ from 'lodash'
import draggable from 'vuedraggable'

import progressConfigQuery from 'gql/admin/progress/progress-query-config.gql'
import progressSaveMutation from 'gql/admin/progress/progress-mutation-save.gql'

const statusIdRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/

export default {
  components: {
    draggable
  },
  data() {
    return {
      loading: false,
      validationError: '',
      // -> Ids present when the page loaded. Changing one of these would orphan every
      //    reader's records for that status, so those fields stay read-only.
      persistedIds: [],
      colors: [
        'grey', 'blue-grey', 'blue', 'light-blue', 'cyan', 'teal', 'green',
        'light-green', 'lime', 'amber', 'orange', 'deep-orange', 'red', 'pink',
        'purple', 'deep-purple', 'indigo', 'brown'
      ],
      config: {
        isEnabled: true,
        showLinkMarkers: true,
        statuses: []
      }
    }
  },
  methods: {
    isNewStatus (status) {
      return !_.includes(this.persistedIds, status.id)
    },
    addStatus () {
      this.config.statuses.push({
        id: '',
        label: '',
        icon: 'mdi-circle-outline',
        color: 'grey',
        isDefault: false,
        showMarker: true
      })
    },
    removeStatus (idx) {
      const removed = this.config.statuses.splice(idx, 1)[0]
      // -> Never leave the list without a default
      if (removed.isDefault && this.config.statuses.length > 0) {
        this.setDefault(0)
      }
    },
    setDefault (idx) {
      this.config.statuses.forEach((status, i) => {
        status.isDefault = (i === idx)
        // -> The default means "untracked", so it never decorates a link
        if (status.isDefault) { status.showMarker = false }
      })
    },
    /**
     * Catch the mistakes the server would silently correct, so the admin sees why.
     * The server re-validates regardless — this is a UX affordance, not a guard.
     *
     * @returns {boolean} Whether the config is safe to submit
     */
    validate () {
      this.validationError = ''
      const statuses = this.config.statuses

      if (statuses.length < 1) {
        this.validationError = this.$t('admin:progress.errorNoStatuses', 'Add at least one status.')
        return false
      }
      const bad = _.find(statuses, s => !statusIdRegex.test(s.id))
      if (bad) {
        this.validationError = this.$t('admin:progress.errorBadId', {
          defaultValue: '"{{id}}" is not a valid ID. Use lowercase letters, numbers and dashes.',
          id: bad.id || this.$t('admin:progress.emptyId', '(empty)')
        })
        return false
      }
      const duplicate = _.findKey(_.countBy(statuses, 'id'), n => n > 1)
      if (duplicate) {
        this.validationError = this.$t('admin:progress.errorDuplicateId', {
          defaultValue: 'The ID "{{id}}" is used more than once.',
          id: duplicate
        })
        return false
      }
      if (_.some(statuses, s => _.isEmpty(_.trim(s.label)))) {
        this.validationError = this.$t('admin:progress.errorNoLabel', 'Every status needs a label.')
        return false
      }
      if (!_.some(statuses, 'isDefault')) {
        this.validationError = this.$t('admin:progress.errorNoDefault', 'Mark one status as the default.')
        return false
      }
      const removed = _.difference(this.persistedIds, _.map(statuses, 'id'))
      if (removed.length > 0) {
        // -> Not an error: records keep their status id, so re-adding it restores them.
        this.$store.commit('showNotification', {
          message: this.$t('admin:progress.removedWarning', {
            defaultValue: 'Removed {{ids}}. Readers who used them keep their data until they are re-added.',
            ids: removed.join(', ')
          }),
          style: 'warning',
          icon: 'alert'
        })
      }
      return true
    },
    async save () {
      if (!this.validate()) { return }

      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-progress-save')
      try {
        const respRaw = await this.$apollo.mutate({
          mutation: progressSaveMutation,
          variables: {
            isEnabled: this.config.isEnabled,
            showLinkMarkers: this.config.showLinkMarkers,
            statuses: this.config.statuses.map(s => ({
              id: _.toLower(_.trim(s.id)),
              label: _.trim(s.label),
              icon: _.trim(s.icon),
              color: s.color,
              isDefault: s.isDefault === true,
              showMarker: s.showMarker === true
            }))
          }
        })
        const resp = _.get(respRaw, 'data.progress.setConfig.responseResult', {})
        if (resp.succeeded) {
          this.persistedIds = _.map(this.config.statuses, 'id')
          this.$store.commit('showNotification', {
            message: this.$t('admin:progress.saveSuccess', 'Progress tracking settings updated successfully.'),
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.$store.commit(`loadingStop`, 'admin-progress-save')
      this.loading = false
    }
  },
  apollo: {
    config: {
      query: progressConfigQuery,
      fetchPolicy: 'network-only',
      update (data) {
        const config = _.cloneDeep(data.progress.config)
        this.persistedIds = _.map(config.statuses, 'id')
        return config
      },
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-progress-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>
.status-drag-handle {
  cursor: grab;
}
</style>
