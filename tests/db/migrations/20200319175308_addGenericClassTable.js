
exports.up = function(knex) {
  return knex.schema.createTable('generic_classes', table => {
    table.increments('id').primary().unsigned()

    table.integer('organization_id').unsigned().index()
      .references('id').inTable('generic_related_persisteds')

    table.string('enrollment').notNullable()
    table.string('cpf').notNullable()
    table.integer('role').notNullable().defaultTo(0)
    table.unique(['cpf', 'organization_id', 'enrollment', 'role'])
    table.string('name').notNullable()

    table.timestamp('created_at')
    table.timestamp('updated_at')
    table.timestamp('deleted_at')
    table.timestamp('restored_at')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('generic_classes')
}
