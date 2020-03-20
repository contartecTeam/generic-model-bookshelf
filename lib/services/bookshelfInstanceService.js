'use strict'

function bookshelfInstanceService(bookshelf) {
  global.bookshelfInstance = bookshelf
}

module.exports = bookshelfInstanceService