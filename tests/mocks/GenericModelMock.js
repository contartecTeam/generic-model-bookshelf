'use strict'

class GenericModelMock {
  constructor (model, defaultObject) {
    this.model = model
    this._modelInstance = Reflect.construct(model, [{}])
    this.tableName = this._modelInstance.tableName
    this.idColumnName = this._modelInstance.idAttribute || 'id'
    this._defaultObject = defaultObject
  }

  create(object) {
    object = Object
      .assign({}, this.defaultObject, object || {})

    const modelObject = Reflect
      .construct(this.model, [object])

    return modelObject
  }

  createObject(object) {
    return Object
      .assign({}, this.defaultObject, object || {})
  }

  insert(object) {
    return new Promise((resolve, reject) => {
      if (!object)
        object = this.createObject()

      db(this.tableName)
        .insert(object, this.idColumnName)
        .then(queryResult => {
          if (queryResult.constructor.name == 'Array')
            object.id = queryResult.pop()

          resolve(this.create(object))
        })
        .catch(reject)
    })
  }

  insertDefault(object) {
    if (!object)
      object = {}

    object = this.createObject(object)

    return this.insert(object)
  }

  delete(params) {
    const model = this
      .create()

    let idAttribute = model.idAttribute || 'id'
    let queryBuilder = model.query()

    if (idAttribute instanceof Array)
      idAttribute = idAttribute[0]

    if (model.getQueryAll)
      queryBuilder = model.getQueryAll(params)
    else {
      if (params)
        queryBuilder.where(params)
      else
        queryBuilder.where(idAttribute, '>', 0)
    }

    queryBuilder
      .select(idAttribute)

    return db(this.tableName)
      .whereRaw(`${idAttribute} IN (${queryBuilder.toString()})`)
      .del()
  }

  get defaultObject () { return this._defaultObject }
}

module.exports = GenericModelMock