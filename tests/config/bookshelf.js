'use strict'

const knex = require('knex')(require('../db/knexfile.js')['test'])

const bookshelf = require('bookshelf')(knex)

bookshelf.ModelBase = require('bookshelf-modelbase')(bookshelf)

bookshelf.plugin('registry')
bookshelf.plugin('pagination')
bookshelf.plugin('visibility')
bookshelf.plugin('virtuals')
bookshelf.plugin(require('bookshelf-soft-delete'))
bookshelf.plugin(require('bookshelf-modelbase').pluggable)

module.exports = bookshelf