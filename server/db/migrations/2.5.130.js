/* global WIKI */

exports.up = async knex => {
  const isMysql = ['mysql', 'mariadb'].includes(WIKI.config.db.type)
  return knex.schema.createTable('userProgress', table => {
    if (isMysql) table.charset('utf8mb4')
    table.integer('userId').unsigned().primary().references('id').inTable('users')
    // -> One JSON blob per user: the reader's whole progress record list
    if (isMysql) {
      table.specificType('data', 'MEDIUMTEXT').notNullable()
    } else {
      table.text('data').notNullable()
    }
    table.bigInteger('updatedAt').notNullable().defaultTo(0)
  })
}

exports.down = knex => knex.schema.dropTableIfExists('userProgress')
