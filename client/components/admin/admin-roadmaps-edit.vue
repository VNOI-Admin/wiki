<template lang="pug">
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          v-btn(icon, @click='$router.push("/roadmaps")')
            v-icon mdi-arrow-left
          .admin-header-title.ml-2
            .headline.primary--text {{ isNew ? 'New Roadmap' : 'Edit Roadmap' }}
            .subtitle-1.grey--text {{ isNew ? 'Create a new learning roadmap' : roadmapId }}
          v-spacer
          v-btn.mr-2(depressed, outlined, :loading='exporting', @click='exportYaml')
            v-icon(left) mdi-download
            span Export YAML
          v-btn(color='success', depressed, :loading='saving', @click='save')
            v-icon(left) mdi-check
            span Save

      v-flex(xs12, lg4)
        v-card
          v-toolbar(color='primary', dark, dense, flat)
            v-toolbar-title.subtitle-1 Roadmap Details
          v-card-text
            v-text-field(
              v-model='form.id'
              label='ID (URL slug)'
              outlined
              dense
              hide-details='auto'
              class='mb-3'
              :readonly='!isNew'
              :hint='isNew ? "Lowercase letters, numbers and hyphens only. Cannot be changed after creation." : "ID cannot be changed after creation."'
              persistent-hint
              @blur='autoSlugId'
            )
            v-text-field(
              v-model='form.title'
              label='Title'
              outlined
              dense
              hide-details='auto'
              class='mb-3'
            )
            v-textarea(
              v-model='form.description'
              label='Description'
              outlined
              dense
              hide-details='auto'
              rows='3'
              class='mb-3'
              auto-grow
            )
            v-switch(
              v-model='form.isEnabled'
              label='Enabled'
              inset
              color='primary'
              hide-details
            )
            v-text-field.mt-3(
              v-model.number='form.sortOrder'
              label='Sort Order'
              type='number'
              outlined
              dense
              hide-details
            )

      v-flex(xs12, lg8)
        v-card
          v-toolbar(color='primary', dark, dense, flat)
            v-toolbar-title.subtitle-1 Sections
            v-spacer
            v-btn(icon, dark, @click='addSection')
              v-icon mdi-plus
          v-card-text(v-if='form.sections.length === 0')
            .text-center.grey--text.py-4
              v-icon(large, color='grey lighten-1') mdi-format-list-bulleted
              div.mt-1 No sections yet. Click + to add one.
          v-card-text.pt-2(v-else)
            draggable(
              v-model='form.sections'
              handle='.drag-handle'
              ghost-class='drag-ghost'
              @end='resequenceSections'
            )
              admin-roadmap-section-editor(
                v-for='(section, idx) in form.sections'
                :key='section.id'
                :section='section'
                @remove='removeSection(idx)'
              )
            v-btn(text, color='primary', @click='addSection')
              v-icon(left) mdi-plus
              | Add Section

    v-snackbar(v-model='snackbar.show', :color='snackbar.color', top)
      | {{ snackbar.message }}
      template(v-slot:action='{ attrs }')
        v-btn(text, v-bind='attrs', @click='snackbar.show = false') Close
</template>

<script>
import draggable from 'vuedraggable'
import { v4 as uuidv4 } from 'uuid'
import _ from 'lodash'
import AdminRoadmapSectionEditor from './admin-roadmap-section-editor.vue'

import singleQuery from 'gql/admin/roadmaps/roadmaps-query-single.gql'
import createMutation from 'gql/admin/roadmaps/roadmaps-mutation-create.gql'
import updateMutation from 'gql/admin/roadmaps/roadmaps-mutation-update.gql'
import exportMutation from 'gql/admin/roadmaps/roadmaps-mutation-export.gql'

export default {
  components: { draggable, AdminRoadmapSectionEditor },
  data () {
    return {
      loading: false,
      saving: false,
      exporting: false,
      form: {
        id: '',
        title: '',
        description: '',
        isEnabled: true,
        sortOrder: 0,
        sections: []
      },
      snackbar: { show: false, message: '', color: 'success' }
    }
  },
  computed: {
    roadmapId () {
      return this.$route.params.id
    },
    isNew () {
      return this.roadmapId === 'new'
    }
  },
  async created () {
    if (!this.isNew) {
      await this.loadRoadmap()
    }
  },
  methods: {
    async loadRoadmap () {
      this.loading = true
      try {
        const resp = await this.$apollo.query({
          query: singleQuery,
          variables: { id: this.roadmapId },
          fetchPolicy: 'network-only'
        })
        const roadmap = _.get(resp, 'data.roadmap.single')
        if (!roadmap) {
          this.notify('Roadmap not found', 'error')
          this.$router.push('/roadmaps')
          return
        }
        this.form = _.cloneDeep(roadmap)
      } catch (err) {
        this.notify(err.message, 'error')
      } finally {
        this.loading = false
      }
    },
    autoSlugId () {
      if (this.isNew && this.form.id === '' && this.form.title) {
        this.form.id = _.kebabCase(this.form.title).replace(/-+/g, '-')
      }
    },
    addSection () {
      this.form.sections.push({
        id: uuidv4(),
        title: 'New Section',
        sortOrder: this.form.sections.length * 10,
        nodes: []
      })
    },
    removeSection (idx) {
      this.form.sections.splice(idx, 1)
    },
    resequenceSections () {
      this.form.sections.forEach((s, i) => { s.sortOrder = i * 10 })
    },
    buildInput () {
      return {
        title: this.form.title,
        description: this.form.description,
        isEnabled: this.form.isEnabled,
        sortOrder: this.form.sortOrder,
        sections: this.form.sections.map((s, si) => ({
          id: s.id,
          title: s.title,
          sortOrder: si * 10,
          nodes: s.nodes.map((n, ni) => ({
            id: n.id,
            title: n.title,
            description: n.description || '',
            difficulty: n.difficulty || 0,
            articlePath: n.articlePath || '',
            externalUrl: n.externalUrl || '',
            sortOrder: ni * 10
          }))
        }))
      }
    },
    async save () {
      this.saving = true
      try {
        const input = this.buildInput()
        if (this.isNew) {
          const resp = await this.$apollo.mutate({
            mutation: createMutation,
            variables: { id: this.form.id, input }
          })
          const result = _.get(resp, 'data.roadmap.create.responseResult')
          if (!result.succeeded) throw new Error(result.message)
          const created = _.get(resp, 'data.roadmap.create.roadmap')
          this.notify('Roadmap created', 'success')
          this.$router.replace(`/roadmaps/${created.id}`)
        } else {
          const resp = await this.$apollo.mutate({
            mutation: updateMutation,
            variables: { id: this.roadmapId, input }
          })
          const result = _.get(resp, 'data.roadmap.update.responseResult')
          if (!result.succeeded) throw new Error(result.message)
          this.notify('Roadmap saved', 'success')
        }
      } catch (err) {
        this.notify(err.message, 'error')
      } finally {
        this.saving = false
      }
    },
    async exportYaml () {
      if (this.isNew) {
        this.notify('Save the roadmap first before exporting', 'warning')
        return
      }
      this.exporting = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: exportMutation,
          variables: { id: this.roadmapId }
        })
        const result = _.get(resp, 'data.roadmap.exportYaml.responseResult')
        if (!result.succeeded) throw new Error(result.message)
        const yamlStr = _.get(resp, 'data.roadmap.exportYaml.yaml')
        const blob = new Blob([yamlStr], { type: 'text/yaml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${this.roadmapId}.yaml`
        a.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        this.notify(err.message, 'error')
      } finally {
        this.exporting = false
      }
    },
    notify (message, color = 'success') {
      this.snackbar = { show: true, message, color }
    }
  }
}
</script>
