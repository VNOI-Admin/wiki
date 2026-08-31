<template lang="pug">
  v-dialog(v-model='isShown', max-width='550', @input='onToggle')
    v-card
      .dialog-header.is-short.is-indigo
        v-icon.mr-3(color='white') mdi-database-cog-outline
        span {{ $t('common:progress.dialog.title', 'Progress Data') }}
      v-card-text
        .body-2.grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-2`')
          | {{ $t('common:progress.dialog.intro', 'Your reading progress is stored in this browser only. It is never sent to the server and is not shared between devices. Export it to move it elsewhere, or to keep a backup.') }}
        v-alert.mt-4.mb-0(v-if='!isPersistent', color='orange', outlined, dense, icon='mdi-alert-outline')
          .caption {{ $t('common:progress.dialog.storageBlocked', 'This browser is blocking local storage, so changes will be lost when you close the tab.') }}

        v-divider.mt-4

        .d-flex.align-center.mt-4
          div
            .subtitle-2 {{ $t('common:progress.dialog.trackedPages', 'Pages tracked') }}
            .caption.grey--text {{ count }}
          v-spacer
          v-btn.text-none(
            @click='exportData'
            :disabled='count < 1'
            outlined
            small
            color='primary'
            )
            v-icon(left, small) mdi-download
            span {{ $t('common:progress.dialog.export', 'Export JSON') }}

        v-divider.mt-4

        .mt-4
          .subtitle-2 {{ $t('common:progress.dialog.import', 'Import') }}
          .caption.grey--text.mb-2 {{ $t('common:progress.dialog.importHint', 'Importing replaces all current progress data.') }}
          input.d-none(ref='fileInput', type='file', accept='application/json,.json', @change='onFileSelected')
          v-btn.text-none(@click='pickFile', outlined, small, color='primary')
            v-icon(left, small) mdi-upload
            span {{ $t('common:progress.dialog.chooseFile', 'Choose file…') }}
          v-alert.mt-3.mb-0(v-if='importError', color='red', outlined, dense, icon='mdi-alert-circle-outline')
            .caption {{ importError }}

        template(v-if='pendingRecords')
          v-divider.mt-4
          v-alert.mt-4.mb-0(color='orange', outlined, dense)
            .caption.mb-2 {{ confirmReplaceText }}
            .d-flex
              v-btn.text-none.mr-2(@click='confirmImport', small, color='orange', dark, depressed)
                span {{ $t('common:progress.dialog.replace', 'Replace') }}
              v-btn.text-none(@click='pendingRecords = null', small, text)
                span {{ $t('common:actions.cancel') }}

        v-divider.mt-4

        .d-flex.align-center.mt-4
          div
            .subtitle-2 {{ $t('common:progress.dialog.clearTitle', 'Clear all') }}
            .caption.grey--text {{ $t('common:progress.dialog.clearHint', 'Delete every tracked page from this browser.') }}
          v-spacer
          v-btn.text-none(@click='clearAll', :disabled='count < 1', outlined, small, color='red')
            v-icon(left, small) mdi-delete
            span {{ $t('common:progress.dialog.clear', 'Clear') }}
      v-card-chin
        v-spacer
        v-btn.text-none(text, @click='isShown = false') {{ $t('common:actions.close') }}
</template>

<script>
import { buildExport, buildExportFilename, downloadExport, parseImport, readFile } from '../../modules/progress/import-export'

const importErrorDefaults = {
  notJson: 'This file is not valid JSON.',
  notProgressData: 'This file does not contain progress data.',
  wrongFormat: 'This file was not exported from a wiki progress tracker.',
  newerVersion: 'This file was exported by a newer version (v{{version}}). Update the wiki, then try again.',
  missingRecords: 'This file is missing its records list.',
  noRecords: 'This file contains no usable records.',
  unreadable: 'Could not read the selected file.'
}

/**
 * Import / export / clear dialog for locally stored progress data.
 *
 * Reachable from the progress card rather than the user profile, because the feature is
 * for anonymous readers and the profile page requires authentication.
 */
export default {
  props: {
    value: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      importError: '',
      pendingRecords: null
    }
  },
  computed: {
    isShown: {
      get () { return this.value },
      set (val) { this.$emit('input', val) }
    },
    count () {
      return this.$progress.count
    },
    isPersistent () {
      return this.$progress.isPersistent
    },
    confirmReplaceText () {
      return this.$t('common:progress.dialog.confirmReplace', {
        defaultValue: 'Replace your current data ({{current}} pages) with {{incoming}} pages from the file?',
        current: this.count,
        incoming: this.pendingRecords ? this.pendingRecords.length : 0
      })
    }
  },
  methods: {
    onToggle (isOpen) {
      if (!isOpen) {
        this.importError = ''
        this.pendingRecords = null
      }
    },
    exportData () {
      downloadExport(buildExport(this.$progress.listRecords()), buildExportFilename())
    },
    pickFile () {
      this.importError = ''
      this.pendingRecords = null
      this.$refs.fileInput.click()
    },
    async onFileSelected (ev) {
      const file = ev.target.files[0]
      // -> Reset so re-selecting the same file fires change again
      ev.target.value = ''
      if (!file) { return }

      try {
        const { records } = parseImport(await readFile(file))
        this.pendingRecords = records
      } catch (err) {
        // -> parseImport/readFile throw an ImportError carrying a stable code, so the
        //    module stays free of user-facing text.
        if (err.code) {
          this.importError = this.$t(`common:progress.importError.${err.code}`, {
            defaultValue: importErrorDefaults[err.code],
            ...err.params
          })
        } else {
          this.importError = err.message
        }
      }
    },
    confirmImport () {
      const total = this.pendingRecords.length
      this.$progress.replaceAll(this.pendingRecords)
      this.pendingRecords = null
      this.$store.commit('showNotification', {
        message: this.$t('common:progress.dialog.imported', {
          defaultValue: 'Imported progress data ({{count}} pages).',
          count: total
        }),
        style: 'success',
        icon: 'check'
      })
    },
    clearAll () {
      this.$progress.clearAll()
      this.$store.commit('showNotification', {
        message: this.$t('common:progress.dialog.cleared', 'All progress data cleared.'),
        style: 'success',
        icon: 'check'
      })
    }
  }
}
</script>
