
exports.up = function(knex) {
  return knex.schema.createTable('generic_related_persisteds', table => {
    table.increments('id').primary().unsigned()
    table.string('name')
    table.integer('parent')

    table.timestamp('created_at')
    table.timestamp('updated_at')
    table.timestamp('deleted_at')
    table.timestamp('restored_at')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('generic_related_persisteds')
}
