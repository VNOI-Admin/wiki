<template lang="pug">
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-map-pin.svg', alt='Roadmaps', style='width: 80px;', onerror='this.style.display="none"')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft Roadmaps
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s Learning roadmaps for readers
          v-spacer
          v-btn.mr-2.animated.fadeInRight(depressed, outlined, @click='importDialog = true')
            v-icon(left) mdi-upload
            span Import YAML
          v-btn.animated.fadeInRight(color='primary', depressed, @click='$router.push("/roadmaps/new")')
            v-icon(left) mdi-plus
            span New Roadmap

      v-flex(xs12)
        v-card.animated.fadeInUp
          v-data-table(
            :headers='headers'
            :items='roadmaps'
            :loading='loading'
            item-key='id'
            sort-by='sortOrder'
          )
            template(v-slot:item.isEnabled='{ item }')
              v-switch(
                v-model='item.isEnabled'
                dense
                inset
                hide-details
                color='primary'
                @change='toggleEnabled(item)'
              )
            template(v-slot:item.nodeCount='{ item }')
              v-chip(x-small, outlined) {{ item.nodeCount }}
            template(v-slot:item.updatedAt='{ item }')
              span.caption {{ new Date(item.updatedAt).toLocaleDateString() }}
            template(v-slot:item.actions='{ item }')
              v-btn(icon, small, color='primary', :href='"/roadmap/" + item.id', target='_blank')
                v-icon(small) mdi-open-in-new
              v-btn(icon, small, @click='$router.push("/roadmaps/" + item.id)')
                v-icon(small) mdi-pencil
              v-btn(icon, small, color='error', @click='confirmDelete(item)')
                v-icon(small) mdi-delete-outline

    v-dialog(v-model='importDialog', max-width='640')
      v-card
        v-toolbar(color='primary', dark, dense, flat)
          v-toolbar-title.subtitle-1 Import Roadmap from YAML
          v-spacer
          v-btn(icon, dark, @click='importDialog = false')
            v-icon mdi-close
        v-card-text.pt-3
          v-textarea(
            v-model='importYaml'
            label='Paste YAML here'
            outlined
            rows='12'
            font-family='monospace'
            hide-details='auto'
          )
        v-card-actions
          v-spacer
          v-btn(text, @click='importDialog = false') Cancel
          v-btn(color='primary', depressed, :loading='importing', @click='doImport')
            v-icon(left) mdi-upload
            span Import

    v-dialog(v-model='deleteDialog', max-width='420')
      v-card
        v-card-title Delete Roadmap
        v-card-text Are you sure you want to delete #[strong {{ deleteTarget && deleteTarget.title }}]? This cannot be undone.
        v-card-actions
          v-spacer
          v-btn(text, @click='deleteDialog = false') Cancel
          v-btn(color='error', depressed, :loading='deleting', @click='doDelete')
            v-icon(left) mdi-delete
            span Delete

    v-snackbar(v-model='snackbar.show', :color='snackbar.color', top)
      | {{ snackbar.message }}
      template(v-slot:action='{ attrs }')
        v-btn(text, v-bind='attrs', @click='snackbar.show = false') Close
</template>

<script>
import _ from 'lodash'

import listQuery from 'gql/admin/roadmaps/roadmaps-query-list.gql'
import updateMutation from 'gql/admin/roadmaps/roadmaps-mutation-update.gql'
import deleteMutation from 'gql/admin/roadmaps/roadmaps-mutation-delete.gql'
import importMutation from 'gql/admin/roadmaps/roadmaps-mutation-import.gql'

export default {
  data () {
    return {
      loading: false,
      roadmaps: [],
      headers: [
        { text: 'Enabled', value: 'isEnabled', width: 90 },
        { text: 'ID', value: 'id', width: 160 },
        { text: 'Title', value: 'title' },
        { text: 'Nodes', value: 'nodeCount', width: 80 },
        { text: 'Updated', value: 'updatedAt', width: 120 },
        { text: 'Actions', value: 'actions', sortable: false, width: 120 }
      ],
      importDialog: false,
      importYaml: '',
      importing: false,
      deleteDialog: false,
      deleteTarget: null,
      deleting: false,
      snackbar: { show: false, message: '', color: 'success' }
    }
  },
  async created () {
    await this.loadRoadmaps()
  },
  methods: {
    async loadRoadmaps () {
      this.loading = true
      try {
        const resp = await this.$apollo.query({ query: listQuery, fetchPolicy: 'network-only' })
        this.roadmaps = _.get(resp, 'data.roadmap.list', [])
      } catch (err) {
        this.notify(err.message, 'error')
      } finally {
        this.loading = false
      }
    },
    async toggleEnabled (item) {
      try {
        const resp = await this.$apollo.mutate({
          mutation: updateMutation,
          variables: {
            id: item.id,
            input: {
              title: item.title,
              description: item.description,
              isEnabled: item.isEnabled,
              sortOrder: item.sortOrder,
              sections: item.sections || []
            }
          }
        })
        const result = _.get(resp, 'data.roadmap.update.responseResult')
        if (!result.succeeded) throw new Error(result.message)
      } catch (err) {
        item.isEnabled = !item.isEnabled
        this.notify(err.message, 'error')
      }
    },
    confirmDelete (item) {
      this.deleteTarget = item
      this.deleteDialog = true
    },
    async doDelete () {
      this.deleting = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: deleteMutation,
          variables: { id: this.deleteTarget.id }
        })
        const result = _.get(resp, 'data.roadmap.delete.responseResult')
        if (!result.succeeded) throw new Error(result.message)
        this.roadmaps = this.roadmaps.filter(r => r.id !== this.deleteTarget.id)
        this.deleteDialog = false
        this.notify('Roadmap deleted', 'success')
      } catch (err) {
        this.notify(err.message, 'error')
      } finally {
        this.deleting = false
      }
    },
    async doImport () {
      if (!this.importYaml.trim()) return
      this.importing = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: importMutation,
          variables: { yaml: this.importYaml }
        })
        const result = _.get(resp, 'data.roadmap.importYaml.responseResult')
        if (!result.succeeded) throw new Error(result.message)
        this.importDialog = false
        this.importYaml = ''
        this.notify('Roadmap imported successfully', 'success')
        await this.loadRoadmaps()
      } catch (err) {
        this.notify(err.message, 'error')
      } finally {
        this.importing = false
      }
    },
    notify (message, color = 'success') {
      this.snackbar = { show: true, message, color }
    }
  }
}
</script>
