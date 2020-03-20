'use strict'

require('dotenv').load({
  silent: true
})

module.exports = {
  test: {
    client      : 'pg',
    connection  : {
      host      : process.env.TEST_HOST,
      database  : process.env.TEST_DB,
      user      : process.env.PG_USER,
      password  : process.env.PG_PASSWORD
    },
    pool        : {
      min: 2,
      max: 10
    },
    migrations  : {
      tableName: 'knex_migrations'
    }
  }
}