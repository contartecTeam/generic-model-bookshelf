'use strict'

const GenericModelMock = require('./GenericModelMock')
const GenericRelatedPersisted = require('../models/GenericRelatedPersisted')

class GenericRelatedPersistedMock extends GenericModelMock {
  constructor() {
    super(GenericRelatedPersisted, GenericRelatedPersistedMock.getDefaultObject())
  }

  get defaultObject() {
    return GenericRelatedPersistedMock
      .getDefaultObject()
  }

  static getDefaultObject() {
    return {
      name        : `Name ${Math.round(Math.random() * 999)}`
    }
  }
}

module.exports = new GenericRelatedPersistedMock()