'use strict'

let bookshelfInstance = null

/**
 * Gets/Sets the current `bookshelf` instance
 *
 * @param {bookshelf} bookshelf The `bookshelf` instance
 *
 * @return {bookshelf} The `bookshelf` instance object
*/
function getInstance(bookshelf) {
  if (bookshelf) {
    bookshelfInstance = bookshelf

    global.bookshelfInstance = bookshelf
  }

  return bookshelfInstance
}

module.exports = getInstance