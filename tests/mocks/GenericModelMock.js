'use strict'

const { knex } = global.bookshelfInstance

// TODO: Change instance to static methods
/**
 * Generic mock class for `bookshelf` models
 * @class GenericModelMock
*/
class GenericModelMock {
  get DEFAULT_ADD_OPTIONS() {
    return {
      withRelated: true
    }
  }

  get DEFAULT_ADD_LIST_OPTIONS() {
    return {
      length      : 3,
      withRelated : false
    }
  }

  constructor (model, defaultObject) {
    this.model = model
    this._modelInstance = Reflect.construct(model, [{}])
    this.tableName = this._modelInstance.tableName
    this.idColumnName = this._modelInstance.idAttribute || 'id'
    this._defaultObject = defaultObject
  }

  /**
   * Returns a mock
   *
   * @param {Object} object The `object` to set the returned mock
   *
   * @return {Object} The mock object
  */
  create(object) {
    object = Object
      .assign({}, this.defaultObject, object || {})

    const modelObject = Reflect
      .construct(this.model, [object])

    return modelObject
  }

  getMock(object) {
    return this.create(object)
  }

  getMocks (params = {}, length = 3) {
    const mocks = []

    for (var i = length - 1; i >= 0; i--)
      mocks.push(this.create(params))

    return mocks
  }

  getIdMock() {
    return Math.round(Math.random() * 999999)
  }

  getIdMocks(length = 3) {
    const ids = []

    for (var i = length - 1; i >= 0; i--)
      ids.push(this.getIdMock())

    return ids
  }

  createObject(object) {
    return Object
      .assign({}, this.defaultObject, object || {})
  }

  insert(object) {
    return new Promise((resolve, reject) => {
      if (!object)
        object = this.createObject()

      knex(this.tableName)
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

    return knex(this.tableName)
      .whereRaw(`${idAttribute} IN (${queryBuilder.toString()})`)
      .del()
  }

  /**
   * Returns the `model`'s related `ids` attrs
   * @async
   * @override
   *
   * @return {Object} The `model`'s related ids
  */
  getRelatedAttrs() {
    return {}
  }


  /**
   * Inserts a random `Model`
   * @async
   *
   * @param {Object} attrs The `Object` attrs to set the `object`
   * @param {Object} options The creation options
   * @param {Object} options.withRelated Whether add random `relateds` relations or not
   *
   * @return {Object} The `Model` object
  */
  async add(attrs = {}, options = {}) {
    const optionsTemp = { ...this.DEFAULT_ADD_OPTIONS, ...options }

    let paramsTemp = { ...attrs }

    if (optionsTemp.withRelated) {
      const relatedAttrs = await this.getRelatedAttrs()

      paramsTemp = { ...relatedAttrs, ...paramsTemp }
    }

    return this
      .insertDefault(
        this
          .create(paramsTemp)
          .toJSON({ virtuals: false, shallow: true })
      )
  }

  /**
   * Inserts the `mocks`
   * @async
   *
   * @param {Array<Generic> | Object} params The object `params` to set in every mock or a list of `mocks`
   * @param {Object} [options] The `mocks` options
   * @param {Number} [options.length = 3] The number of `mocks` to be created
   * @param {Boolean} [options.withRelated = false] Whether it should create (aka insert) the required model relations (aka its `required` `FKs`)
   *
   * @return {Array<Generic>} The list of created `mocks`
  */
  async addList(params, options = {}) {
    const optionsTemp = { ...this.DEFAULT_ADD_LIST_OPTIONS, ...options }

    let paramsTemp = { ...params }

    if (['number', 'string'].includes(typeof(options)))
      optionsTemp.length = options

    if (optionsTemp.withRelated) {
      const relatedAttrs = await this.getRelatedAttrs()

      paramsTemp = { ...relatedAttrs, ...paramsTemp }
    }

    const mocks = params instanceof Array ?
      [ ...params ] :
      this.getMocks(paramsTemp, optionsTemp.length)

    const promises = mocks
      .map(mock => {
        const mockJSON = mock
          .toJSON({
            virtuals    : false,
            shallow     : true,
            formatType  : 'format'
          })

        return this
          .insertDefault(mockJSON)
      })

    return await Promise.all(promises)
  }

  /**
   * Deletes a list
   * @async
   *
   * @param {(Array<Number> | Array<Object> | Number | Object)} objects The list of `objects` to remove from `db`
   *
   * @return {Object}  this
  */
  async deleteList(objects) {
    if (objects && !(objects instanceof Array))
      objects = [objects]

    let ids = []

    if (objects.length) {
      if (typeof(objects[0]) == 'object') {
        ids = objects
          .map(t => t.id)
      }
      else
        ids = [ ...objects ]

      await this
        .delete({
          id_in: ids
        })
    }

    return this
  }

  get defaultObject () { return this._defaultObject }
}

module.exports = GenericModelMock