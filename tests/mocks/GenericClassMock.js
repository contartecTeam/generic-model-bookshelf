'use strict'

const GenericModelMock = require('./GenericModelMock')
const GenericClass = require('../models/GenericClass')

class GenericClassMock extends GenericModelMock {
  constructor() {
    super(GenericClass, GenericClassMock.getDefaultObject())
  }

  get defaultObject() {
    return GenericClassMock
      .getDefaultObject()
  }

  static getDefaultObject() {
    return {
      name        : `Name ${Math.round(Math.random() * 999)}`,
      cpf         : `${Math.floor(Math.random() * (99999999999 - 10000000000)) + 10000000000}`,
      enrollment  : `enrollment ${Math.round(Math.random() * 999)}`,
      role        : 0
    }
  }
}

module.exports = new GenericClassMock()