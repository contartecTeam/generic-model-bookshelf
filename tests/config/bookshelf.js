'use strict'

const knex = require('knex')(require('../db/knexfile.js')['test'])

const bookshelf = require('bookshelf')(knex)

bookshelf.ModelBase = require('bookshelf-modelbase')(bookshelf)

bookshelf.plugin('bookshelf-virtuals-plugin')
bookshelf.plugin(require('bookshelf-soft-delete'))
bookshelf.plugin(require('bookshelf-modelbase').pluggable)

module.exports = bookshelf