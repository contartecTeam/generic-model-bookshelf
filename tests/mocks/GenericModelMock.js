'use strict'

const { knex } = global.bookshelfInstance

// TODO: Change instance to static methods
/**
 * Generic mock class for `bookshelf` models
 * @class GenericModelMock
*/
class GenericModelMock {
  /**
   * Default options for `bookshelf`'s `save` operation used in [`add`]{@link GenericModelMock.add}
   * @override
   * @type {Object}
  */
  get DEFAULT_ADD_OPTIONS() {
    return {
      withRelated: true
    }
  }

  /**
   * Default options for `bookshelf`'s `save` operation used in [`addList`]{@link GenericModelMock.addList}
   * @override
   * @type {Object}
  */
  get DEFAULT_ADD_LIST_OPTIONS() {
    return {
      length      : 3,
      withRelated : false
    }
  }

  /**
   * The mock object to be used as default in `getMock`, `getMocks`, `add`, `addList`, etc
   * @override
   * @type {Object}
  */
  get defaultObject () { return this._defaultObject }

  /**
   * Creates a `mock` for `model`
   *
   * @param {GenericModel} model The `model` class
   * @param {Object} defaultObject The default object for this mock
   *
   * @return {Object} The `model` instance
  */
  constructor (model, defaultObject) {
    this.model = model
    this._modelInstance = Reflect.construct(model, [{}])
    this.tableName = this._modelInstance.tableName
    this.idColumnName = this._modelInstance.idAttribute || 'id'
    this._defaultObject = defaultObject
  }

  /**
   * Returns a mock instance
   *
   * @param {Object} object The `object` to set the returned mock
   *
   * @return {Object} The mock instance
  */
  getMock(object) {
    return this.create(object)
  }

  /**
   * Returns the lis of mock instances
   *
   * @param {Object} params The `attrs` to set in mocks
   * @param {Number} length The number of mocks to be created
   *
   * @return {Array} The lis of mock instances
  */
  getMocks (params = {}, length = 3) {
    const mocks = []

    for (var i = length - 1; i >= 0; i--)
      mocks.push(this.create(params))

    return mocks
  }

  /**
   * Returns a mocked `id` attr
   *
   * @return {*} The mock `id` attr
  */
  getIdMock() {
    return Math.round(Math.random() * 999999)
  }

  /**
   * Returns a list of mocked `id` attrs
   *
   * @param {Number} length The number of ids to be created
   *
   * @return {*} The list of mock `id` attrs
  */
  getIdMocks(length = 3) {
    const ids = []

    for (var i = length - 1; i >= 0; i--)
      ids.push(this.getIdMock())

    return ids
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
   * Returns a mock `object`
   *
   * @param {Object} object The `object` to set the returned mock
   *
   * @return {Object} The mock `object`
  */
  createObject(object) {
    return Object
      .assign({}, this.defaultObject, object || {})
  }

  /**
   * Returns a mock instance
   *
   * @param {Object} object The `object` to set the returned mock
   *
   * @return {Object} The mock instance
  */
  create(object) {
    const objectTemp = this.createObject(object)

    const modelObject = Reflect
      .construct(this.model, [objectTemp])

    return modelObject
  }

  /**
   * Inserts a mock on `db`
   *
   * @param {Object} object The `object` to be inserted
   *
   * @return {Promise} The inserted mock
  */
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

  /**
   * Inserts a mock on `db` using `this.defaultObject`
   *
   * @param {Object} object The `object` to be inserted
   *
   * @return {Promise} The inserted mock
  */
  insertDefault(object) {
    if (!object)
      object = {}

    object = this.createObject(object)

    return this.insert(object)
  }

  /**
   * Deletes `db` rows based on `params`
   *
   * @param {Object} params The filter params
   *
   * @return {Promise} The `knex` `del` response
  */
  delete(params) {
    const model = this.create()

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
}

module.exports = GenericModelMock