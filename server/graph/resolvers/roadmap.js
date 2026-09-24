const graphHelper = require('../../helpers/graph')

/* global WIKI */

module.exports = {
  Query: {
    async roadmap () { return {} }
  },
  Mutation: {
    async roadmap () { return {} }
  },
  RoadmapQuery: {
    async list () {
      const rows = await WIKI.models.roadmaps.query()
        .select('id', 'title', 'description', 'isEnabled', 'sortOrder', 'sections', 'updatedAt')
        .orderBy('sortOrder')
      return rows.map(r => ({
        ...r,
        nodeCount: WIKI.models.roadmaps.nodeCount(r.sections)
      }))
    },
    async single (obj, { id }) {
      return WIKI.models.roadmaps.query().findById(id) || null
    }
  },
  RoadmapMutation: {
    async create (obj, { id, input }) {
      try {
        const existing = await WIKI.models.roadmaps.query().findById(id)
        if (existing) throw new Error(`A roadmap with id "${id}" already exists.`)

        const result = WIKI.models.roadmaps.validate(id, input)
        if (result.errors.length > 0) throw new Error(result.errors.join('\n'))

        const now = new Date().toISOString()
        const roadmap = await WIKI.models.roadmaps.query().insertAndFetch({
          ...result.data,
          createdAt: now,
          updatedAt: now
        })
        return { responseResult: graphHelper.generateSuccess('Roadmap created'), roadmap }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    async update (obj, { id, input }) {
      try {
        const existing = await WIKI.models.roadmaps.query().findById(id)
        if (!existing) throw new Error(`Roadmap "${id}" not found.`)

        const result = WIKI.models.roadmaps.validate(id, input)
        if (result.errors.length > 0) throw new Error(result.errors.join('\n'))

        const now = new Date().toISOString()
        const roadmap = await WIKI.models.roadmaps.query().patchAndFetchById(id, {
          ...result.data,
          updatedAt: now
        })
        return { responseResult: graphHelper.generateSuccess('Roadmap updated'), roadmap }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    async delete (obj, { id }) {
      try {
        const deleted = await WIKI.models.roadmaps.query().deleteById(id)
        if (!deleted) throw new Error(`Roadmap "${id}" not found.`)
        return { responseResult: graphHelper.generateSuccess('Roadmap deleted') }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    async importYaml (obj, { yaml }) {
      try {
        const result = WIKI.models.roadmaps.fromYaml(yaml)
        if (result.errors.length > 0) throw new Error(result.errors.join('\n'))

        const now = new Date().toISOString()
        const existing = await WIKI.models.roadmaps.query().findById(result.data.id)
        let roadmap
        if (existing) {
          roadmap = await WIKI.models.roadmaps.query().patchAndFetchById(result.data.id, {
            ...result.data,
            updatedAt: now
          })
        } else {
          roadmap = await WIKI.models.roadmaps.query().insertAndFetch({
            ...result.data,
            createdAt: now,
            updatedAt: now
          })
        }
        return { responseResult: graphHelper.generateSuccess('Roadmap imported'), roadmap }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    async exportYaml (obj, { id }) {
      try {
        const roadmap = await WIKI.models.roadmaps.query().findById(id)
        if (!roadmap) throw new Error(`Roadmap "${id}" not found.`)
        const yamlStr = WIKI.models.roadmaps.toYaml(roadmap)
        return { responseResult: graphHelper.generateSuccess('Roadmap exported'), yaml: yamlStr }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
