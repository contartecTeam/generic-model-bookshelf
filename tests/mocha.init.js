'use strict'

const chai = require('chai')
const chaiThings = require('chai-things')
const chaiShallowDeepEqual = require('chai-shallow-deep-equal')
const co = require('co')

const knexCleaner = require('knex-cleaner')

chai.use(chaiThings)
chai.use(chaiShallowDeepEqual)
chai.use(require('chai-as-promised'))
chai.use(require('sinon-chai'))

global.sinon = require('sinon')
global.expect = chai.expect

if (!process.env.TEST_DB)
  require('dotenv').config({ path: 'tests/db/.env' })

const bookshelf = require('./config/bookshelf')

global.db = bookshelf.knex

require('../lib/services/bookshelfInstanceService')(bookshelf)

global.clear_database = function*() {
  yield knexCleaner.clean(global.db, { ignoreTables: ['knex_migrations'] })
}

global.execAsync = function(generatorFunction) {
  return co(
    generatorFunction()
  )
}

process
  .on('uncaughtException', () => {
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1)
    }
  })