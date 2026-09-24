const Model = require('objection').Model
const _ = require('lodash')
const yaml = require('js-yaml')
const { v4: uuidv4 } = require('uuid')

/* global WIKI */

const VALID_DIFFICULTIES = new Set([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])
const ROADMAP_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LOCALE_PATH_RE = /^[a-z]{2}\/.+/
const URL_RE = /^https?:\/\//

const NODE_KEYS = ['id', 'title', 'description', 'difficulty', 'articlePath', 'externalUrl', 'sortOrder']
const SECTION_KEYS = ['id', 'title', 'sortOrder', 'nodes']

/**
 * Roadmaps model
 */
module.exports = class Roadmap extends Model {
  static get tableName () { return 'roadmaps' }
  static get idColumn () { return 'id' }

  static get jsonSchema () {
    return {
      type: 'object',
      required: ['id', 'title', 'sections'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        isEnabled: { type: 'boolean' },
        sortOrder: { type: 'integer' },
        sections: { type: 'array' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  }

  /**
   * Validate and normalise a roadmap id + input object.
   * Returns { errors: string[] } on failure, or the normalised roadmap data on success.
   */
  static validate (id, input) {
    const errors = []

    if (!ROADMAP_ID_RE.test(id)) {
      errors.push(`id "${id}" must be lowercase alphanumeric with hyphens (e.g. "my-roadmap")`)
    }
    if (!input.title || String(input.title).trim().length === 0) {
      errors.push('title is required')
    }
    if (input.title && input.title.length > 255) {
      errors.push('title must be ≤ 255 characters')
    }
    if (input.description && input.description.length > 2000) {
      errors.push('description must be ≤ 2000 characters')
    }

    const sections = (input.sections || []).map((rawSection, si) => {
      const section = _.pick(rawSection, SECTION_KEYS)
      if (!UUID_RE.test(section.id)) section.id = uuidv4()
      if (!section.title || String(section.title).trim().length === 0) {
        errors.push(`sections[${si}].title is required`)
      }
      if (section.title && section.title.length > 255) {
        errors.push(`sections[${si}].title must be ≤ 255 characters`)
      }

      const nodes = (section.nodes || []).map((rawNode, ni) => {
        const node = _.pick(rawNode, NODE_KEYS)
        if (!UUID_RE.test(node.id)) node.id = uuidv4()
        if (!node.title || String(node.title).trim().length === 0) {
          errors.push(`sections[${si}].nodes[${ni}].title is required`)
        }
        if (node.title && node.title.length > 255) {
          errors.push(`sections[${si}].nodes[${ni}].title must be ≤ 255 characters`)
        }

        const diff = Number(node.difficulty) || 0
        if (!VALID_DIFFICULTIES.has(diff)) {
          errors.push(`sections[${si}].nodes[${ni}].difficulty must be 0–5 in 0.5 steps`)
        }

        if (node.articlePath && !LOCALE_PATH_RE.test(node.articlePath)) {
          errors.push(`sections[${si}].nodes[${ni}].articlePath must start with locale prefix (e.g. "en/algo/dp")`)
        }
        if (node.externalUrl && !URL_RE.test(node.externalUrl)) {
          errors.push(`sections[${si}].nodes[${ni}].externalUrl must be a valid http/https URL`)
        }

        return {
          id: node.id,
          title: String(node.title || '').trim(),
          description: String(node.description || '').trim(),
          difficulty: diff,
          articlePath: String(node.articlePath || '').trim(),
          externalUrl: String(node.externalUrl || '').trim(),
          sortOrder: Number(node.sortOrder) || ni * 10
        }
      })

      // re-sequence sortOrder
      nodes.forEach((n, i) => { n.sortOrder = i * 10 })

      return {
        id: section.id,
        title: String(section.title || '').trim(),
        sortOrder: Number(section.sortOrder) || si * 10,
        nodes
      }
    })

    sections.forEach((s, i) => { s.sortOrder = i * 10 })

    if (errors.length > 0) return { errors }

    return {
      errors: [],
      data: {
        id,
        title: String(input.title).trim(),
        description: String(input.description || '').trim(),
        isEnabled: input.isEnabled !== false,
        sortOrder: Number(input.sortOrder) || 0,
        sections
      }
    }
  }

  /**
   * Parse a YAML string into a normalised roadmap.
   * Returns { errors } or { errors: [], data }.
   */
  static fromYaml (yamlStr) {
    let parsed
    try {
      parsed = yaml.load(yamlStr)
    } catch (err) {
      return { errors: [`YAML parse error: ${err.message}`] }
    }
    if (!parsed || typeof parsed !== 'object') {
      return { errors: ['YAML must be a mapping object'] }
    }
    return Roadmap.validate(String(parsed.id || ''), parsed)
  }

  /**
   * Serialize a roadmap row to a YAML string.
   */
  static toYaml (row) {
    return yaml.dump({
      id: row.id,
      title: row.title,
      description: row.description,
      isEnabled: row.isEnabled,
      sections: row.sections
    }, { lineWidth: 120 })
  }

  /**
   * Count all nodes across all sections of a sections array.
   */
  static nodeCount (sections) {
    return _.sumBy(sections || [], s => _.get(s, 'nodes.length', 0))
  }
}
