/* global WIKI */

exports.up = async knex => {
  const charset = ['mysql', 'mariadb'].includes(WIKI.config.db.type)
  return knex.schema.createTable('roadmaps', table => {
    if (charset) table.charset('utf8mb4')
    table.string('id', 64).primary()
    table.string('title', 255).notNullable()
    table.text('description').defaultTo('')
    table.boolean('isEnabled').notNullable().defaultTo(true)
    table.integer('sortOrder').notNullable().defaultTo(0)
    table.json('sections').notNullable()
    table.string('createdAt', 30).notNullable()
    table.string('updatedAt', 30).notNullable()
  })
}

exports.down = knex => knex.schema.dropTableIfExists('roadmaps')
