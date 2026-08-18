const stream = require('stream')
const Promise = require('bluebird')
const pipeline = Promise.promisify(stream.pipeline)

/* global WIKI */

// For some reason, i cannot get the table name `pagesVector` to work in my local
// so I have to use `pagesvector` instead. Seem to be a mismatched case between mariadb and my macos machine

module.exports = {
  async activate() {
    if (!['mysql', 'mariadb'].includes(WIKI.config.db.type)) {
      throw new WIKI.Error.SearchActivationFailed('Must use MariaDB / MySQL database to activate this engine!')
    }
  },
  async deactivate() {
    WIKI.logger.info(`(SEARCH/MARIADB) Dropping index tables...`)
    await WIKI.models.knex.schema.dropTableIfExists('pagesvector')
    WIKI.logger.info(`(SEARCH/MARIADB) Index tables have been dropped.`)
  },
  /**
   * INIT
   */
  async init() {
    WIKI.logger.info(`(SEARCH/MARIADB) Initializing...`)

    const indexExists = await WIKI.models.knex.schema.hasTable('pagesvector')
    if (!indexExists) {
      WIKI.logger.info(`(SEARCH/MARIADB) Creating Pages Vector table...`)
      await WIKI.models.knex.schema.createTable('pagesvector', table => {
        table.increments()
        table.string('path')
        table.string('locale')
        table.string('title')
        table.string('description')
        table.text('content')
      })
      // -> knex has no FULLTEXT index builder for mysql, add it raw
      await WIKI.models.knex.raw('ALTER TABLE pagesvector ADD FULLTEXT INDEX pagesvector_ft (title, description, content)')
    }

    WIKI.logger.info(`(SEARCH/MARIADB) Initialization completed.`)
  },
  /**
   * QUERY
   *
   * @param {String} q Query
   * @param {Object} opts Additional options
   */
  async query(q, opts) {
    try {
      // -> Boolean mode: +term* per word = every word required (AND) + prefix match, so more words = fewer results; Natural mode: as-is
      const against = this.config.searchMode === 'natural' ? {
        expr: 'IN NATURAL LANGUAGE MODE',
        term: q
      } : {
        expr: 'IN BOOLEAN MODE',
        term: q.trim().split(/\s+/).filter(Boolean).map(t => `+${t}*`).join(' ')
      }

      let qry = `
        SELECT id, path, locale, title, description,
          MATCH(title, description, content) AGAINST (? ${against.expr}) AS relevance
        FROM pagesvector
        WHERE (MATCH(title, description, content) AGAINST (? ${against.expr}) OR path LIKE ?)
      `
      let qryParams = [against.term, against.term, `%${q.toLowerCase()}%`]

      if (opts.locale) {
        qry = `${qry} AND locale = ?`
        qryParams.push(opts.locale)
      }
      if (opts.path) {
        qry = `${qry} AND path LIKE ?`
        qryParams.push(`%${opts.path}`)
      }
      const [results] = await WIKI.models.knex.raw(`
        ${qry}
        ORDER BY relevance DESC
        LIMIT ${WIKI.config.search.maxHits}
      `, qryParams)
      return {
        results,
        suggestions: [],
        totalHits: results.length
      }
    } catch (err) {
      WIKI.logger.warn('Search Engine Error:')
      WIKI.logger.warn(err)
    }
  },
  /**
   * CREATE
   *
   * @param {Object} page Page to create
   */
  async created(page) {
    await WIKI.models.knex.raw(`
      INSERT INTO pagesvector (path, locale, title, description, content) VALUES (?, ?, ?, ?, ?)
    `, [page.path, page.localeCode, page.title, page.description, page.safeContent])
  },
  /**
   * UPDATE
   *
   * @param {Object} page Page to update
   */
  async updated(page) {
    await WIKI.models.knex.raw(`
      UPDATE pagesvector SET title = ?, description = ?, content = ? WHERE path = ? AND locale = ?
    `, [page.title, page.description, page.safeContent, page.path, page.localeCode])
  },
  /**
   * DELETE
   *
   * @param {Object} page Page to delete
   */
  async deleted(page) {
    await WIKI.models.knex('pagesvector').where({
      locale: page.localeCode,
      path: page.path
    }).del()
  },
  /**
   * RENAME
   *
   * @param {Object} page Page to rename
   */
  async renamed(page) {
    await WIKI.models.knex('pagesvector').where({
      locale: page.localeCode,
      path: page.path
    }).update({
      locale: page.destinationLocaleCode,
      path: page.destinationPath
    })
  },
  /**
   * REBUILD INDEX
   */
  async rebuild() {
    WIKI.logger.info(`(SEARCH/MARIADB) Rebuilding Index...`)
    await WIKI.models.knex('pagesvector').truncate()

    await pipeline(
      WIKI.models.knex.column('path', 'localeCode', 'title', 'description', 'render').select().from('pages').where({
        isPublished: true,
        isPrivate: false
      }).stream(),
      new stream.Transform({
        objectMode: true,
        transform: async (page, enc, cb) => {
          const content = WIKI.models.pages.cleanHTML(page.render)
          await WIKI.models.knex.raw(`
            INSERT INTO pagesvector (path, locale, title, description, content) VALUES (?, ?, ?, ?, ?)
          `, [page.path, page.localeCode, page.title, page.description, content])
          cb()
        }
      })
    )

    WIKI.logger.info(`(SEARCH/MARIADB) Index rebuilt successfully.`)
  }
}
