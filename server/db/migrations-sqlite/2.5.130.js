exports.up = async knex => {
  return knex.schema.createTable('userProgress', table => {
    table.integer('userId').primary().references('id').inTable('users')
    // -> One JSON blob per user: the reader's whole progress record list
    table.text('data').notNullable()
    table.bigInteger('updatedAt').notNullable().defaultTo(0)
  })
}

exports.down = knex => knex.schema.dropTableIfExists('userProgress')
