'use strict'

const ObjectUtils = require('@ourwork/object-utils')
const validate = require('validate.js')

const QueryBuilderUtils = require('./utils/QueryBuilderUtils')

const bookshelf = global.bookshelfInstance
const knex = global.bookshelfInstance.knex

const DEFAULT_ATTRIBUTES = {
  requireFetch: false
}

/**
 * Generic model for `bookshelf` ORM
 * @class GenericModel
 * @extends {bookshelf.Model}
*/
class GenericModel extends bookshelf.Model {

  /**
   * The default filter params for [`.getAll`]{@link GenericModel.getAll}
   * @override
   * @type {Object}
  */
  static get GET_ALL_DEFAULT_PARAMS() {
    return {
      page      : 1,
      pageSize  : 500
    }
  }

  /**
   * The default `fetch` for [`.getAll`]{@link GenericModel.getAll}
   * @override
   * @type {Object}
  */
  static get GET_ALL_DEFAULT_FETCH_OPTIONS() {
    return {
      withRelated: this.relateds
    }
  }

  static get bookshelf()  { return bookshelf }
  static get knex()       { return bookshelf.knex }

  get tableName()     { return this._tableName }
  get idAttribute()   { return this._idAttribute }
  get hasTimestamps() { return this._hasTimestamps }
  get soft()          { return this._soft }
  get requireFetch()  { return this._requireFetch }

  get visible()       { return this._visible || [] }
  get hidden()        { return this._hidden || [] }

  get constraints()   { return this._constraints }
  get virtuals()      { return this._virtuals }
  get relateds()      { return this._relateds }

  get _SERIALIZE_OPTIONS() {
    return {
      shallow   : false,
      omitPivot : false,
      virtuals  : true
    }
  }

  constructor (properties, object) {
    super()

    const propertiesTemp = { ...DEFAULT_ATTRIBUTES, ...properties }

    Object
      .assign(this, ObjectUtils.createPrivateAttributes(propertiesTemp))

    this
      ._setValues(object)
      ._setId(object)
      ._setRelateds(object)

    if (this._hasAttributes() || propertiesTemp.virtuals)
      this._setVirtuals(propertiesTemp.virtuals, object)
  }

  getIdObject() {
    return !this._isCompositePrimaryKey() ?
      { [this.idAttribute]: this.id } :
      this.id
  }

  getAttributes() {
    let attributes = []

    if (this._hasVisibleAttributes()) {
      attributes = this.visible

      if (this.hidden)
        attributes = attributes.concat(this.hidden)
    }

    return attributes
  }

  getQueryAll(params, queryBuilder, isWhere) {
    return GenericModel
      .getQueryAll(params, this, queryBuilder, isWhere)
  }

  findById(id, options = {}) {
    const fetchParams = typeof(id) == 'object' ?
      id : { [this.idAttribute]: id }

    const fetchOptions = Object
      .assign({}, { require: false }, options)

    return this
      .where(fetchParams)
      .fetch(fetchOptions)
  }

  delete() {
    const whereParams = this.getIdObject()

    let methodName = 'del'
    let methodParams = null

    if (this.soft) {
      methodName = 'update'

      methodParams = {
        deleted_at  : new Date(),
        updated_at  : new Date()
      }
    }

    return this
      .query()
      .where(whereParams)
      [methodName](methodParams)
  }

  setVirtual(name, virtual) {
    let getter, setter

    if (virtual && virtual.get) {
      getter = virtual.get
      setter = virtual.set ?
        virtual.set :
        function(value) { virtual = value }
    }
    else
      getter = virtual

    if (typeof(getter) != 'function')
      getter = function() { return virtual }

    this._virtuals[name] = {
      get   : getter,
      set   : setter
    }

    return this
  }

  async isPersisted() {
    let count = 0

    if (this.id) {
      const params = this.getIdObject()

      count = await this
        .where(params)
        .count(params)
    }

    return count == 1
  }

  isDeleted() {
    return this.get('deleted_at') > (this.get('restored_at') || null)
  }

  *areConstraintsValids() {
    // eslint-disable-next-line no-useless-catch
    try {
      const idParams = this.getIdObject()

      const constraintParams = this.
        _createObjectByArrayAttributes(this.constraints)

      const count = yield this
        .query(
          qb => {
            qb
              .where(constraintParams)

            for (const attr in idParams) {
              qb
                .andWhere(attr, '<>', idParams[attr] || 0)
            }
          }
        )
        .count()

      return count == 0
    }
    catch (e) {
      throw e
    }
  }

  isObjectValid() {
    return this.validation() == null
  }

  validation(format) {
    return validate(this.toJSON({ virtuals: false, shallow: true }), this._validationRules, format)
  }

  serialize(options) {
    const optionsTemp = { ...this._SERIALIZE_OPTIONS, ...options }

    let json = super
      .serialize(optionsTemp)

    if (optionsTemp.virtuals)
      json = { ...this._getVirtuals(), ...json }

    if (!optionsTemp.shallow && this.relateds) {
      this.relateds
        .forEach(related => {

          json[related] = this.related(related).toJSON()
        })
    }

    if (this.hidden) {
      for (let i = this.hidden.length - 1; i >= 0; i--)
        delete json[this.hidden[i]]
    }

    if (!optionsTemp.omitPivot) {
      const pivots = this._getPivots(this.attributes)

      for (const pivotName in pivots) {
        const attrName = pivotName.replace('_pivot_', '')

        json[attrName] = pivots[pivotName]
      }
    }

    return json
  }

  toJSON(options) {
    return this
      .serialize(options)
  }

  _getId(object) {
    if (!object)
      object = this.getAttributes()

    let id = {}

    if (object && this._hasIdAttribute()) {
      if (this._isCompositePrimaryKey()) {
        this.idAttribute
          .forEach(
            attr =>
              id[attr] = object[attr]
          )
      }
      else
        id = object[this.idAttribute]
    }

    return id
  }

  _getAttributes(object) {
    let visibleAttributes = {}

    if (this._hasVisibleAttributes()) {
      const definedAttributes = this.getAttributes()

      for (const attr in object) {
        if (definedAttributes.indexOf(attr) >= 0)
          visibleAttributes[attr] = object[attr]
      }
    }
    else
      visibleAttributes = object

    return visibleAttributes
  }

  _getVisibleAttributes(object) {
    let visibleAttributes = {}

    if (this._hasVisibleAttributes()) {
      for (const attr in object) {
        if (this._hasVisibleAttribute(attr))
          visibleAttributes[attr] = object[attr]
      }
    }
    else
      visibleAttributes = object

    return visibleAttributes
  }

  _getHiddenAttributes(object) {
    let hiddenAttributes = {}

    if (this._hasHiddenAttributes()) {
      for (const attr in object) {
        if (this._hasHiddenAttribute(attr))
          hiddenAttributes[attr] = object[attr]
      }
    }
    else
      hiddenAttributes = object

    return hiddenAttributes
  }

  _getNotDefinedAttributes(object) {
    let notDefinedAttributes = {}

    if (this._hasAttributes()) {
      for (const attr in object) {
        if (!this._hasAttribute(attr) && !attr.startsWith('_pivot_'))
          notDefinedAttributes[attr] = object[attr]
      }
    }
    else
      notDefinedAttributes = object

    return notDefinedAttributes
  }

  _getRelateds(object) {
    const relateds = {}

    if (this._hasRelateds()) {
      for (const attr in object) {
        if (this._hasRelated(attr))
          relateds[attr] = object[attr]
      }
    }

    return relateds
  }

  _getPivots(object) {
    const pivots = {}

    for (const attr in object) {
      if (attr.startsWith('_pivot_'))
        pivots[attr] = object[attr]
    }

    return pivots
  }

  _getVirtuals() {
    const virtuals = {}

    const virtualNames = {
      ...this._virtuals,
      ...this._getNotDefinedAttributes(this.attributes)
    }

    if (virtualNames != {}) {
      for (const virtualName in virtualNames)
        virtuals[virtualName] = this._getVirtual(virtualName)
    }

    return virtuals
  }

  _getVirtual(name) {
    let virtual = null

    if (this.attributes[name])
      virtual = this.attributes[name]
    else if (this._virtuals[name]) {
      virtual = this._virtuals[name].get ?
        this._virtuals[name].get.call(this) :
        this._virtuals[name].call(this)
    }

    return virtual
  }

  _createObjectByArrayAttributes(arrayAttributes) {
    const params = {}

    arrayAttributes
      .forEach(
        attr =>
          params[attr] = this.get(attr)
      )

    return params
  }

  _isCompositePrimaryKey() {
    return this.idAttribute.constructor.name == 'Array'
  }

  _hasIdAttribute() {
    return this.idAttribute != null
  }

  _hasVisibleAttributes() {
    return this.visible && this.visible.length
  }

  _hasHiddenAttributes() {
    return this.hidden && this.hidden.length
  }

  _hasRelateds() {
    return this.relateds && this.relateds.length
  }

  _hasAttributes() {
    return this._hasVisibleAttributes() || this._hasHiddenAttributes()
  }

  _hasVisibleAttribute(attr) {
    let hasAttr = false

    if (this._hasVisibleAttributes())
      hasAttr = this.visible.indexOf(attr) >= 0

    return hasAttr
  }

  _hasHiddenAttribute(attr) {
    let hasAttr = false

    if (this._hasHiddenAttributes())
      hasAttr = this.hidden.indexOf(attr) >= 0

    return hasAttr
  }

  _hasAttribute(attr) {
    return this._hasVisibleAttribute(attr) || this._hasHiddenAttribute(attr)
  }

  _hasRelated(attr) {
    let hasAttr = false

    if (this._hasRelateds())
      hasAttr = this.relateds.indexOf(attr) >= 0

    return hasAttr
  }

  _setValues(object) {
    Object
      .assign(this.attributes, this._getAttributes(object))

    Object
      .assign(this.attributes, this._getPivots(object))

    return this
  }

  _setId(object) {
    this.id = this._getId(object)

    return this
  }

  _setRelateds(object) {
    if (this._hasRelateds()) {
      const relatedObjects = this._getRelateds(object)

      for (var i = this.relateds.length - 1; i >= 0; i--) {
        const relatedName = this.relateds[i]

        this
          .related(relatedName)
          .set(relatedObjects[relatedName])
      }
    }

    return this
  }

  _setVirtuals(virtuals = {}, object = {}) {
    const attrsNotDefined = this._getNotDefinedAttributes(object)

    this._virtuals = Object
      .assign({}, virtuals)

    if (object && this._hasVisibleAttributes()) {
      for (const virtualName in attrsNotDefined) {
        this
          .setVirtual(virtualName, attrsNotDefined[virtualName])
      }
    }

    return this
  }

  /**
   * Returns the list of objects
   *
   * @param {Object} params The `params` object to filter the attrs
   * @param {Number} params.page The `page` itens
   * @param {Number} params.pageSize The `page` size
   * @param {(Object | string)} params.orderBy The `attrName` to order for (asc) or an object, `attrName: 'ASC | DESC'`
   * @param {Array} params.distinct The `distinct` attrs to group
   * @param {string} params.genericSearch The `genericSearch` text
   * @param {Object} fetchOptions The `bookshelf` fetch options (@see {@link https://bookshelfjs.org/api.html#Model-instance-fetch})
   *
   * @return {Promise<Array>} The resulted list
  */
  static getAll(params, fetchOptions = {}) {
    const paramsTemp = { ...this.GET_ALL_DEFAULT_PARAMS, ...params }
    const fetchOptionsTemp = { ...this.GET_ALL_DEFAULT_FETCH_OPTIONS, ...fetchOptions }

    if (typeof(paramsTemp.orderBy) == 'string')
      paramsTemp.orderBy = { [paramsTemp.orderBy]: 'ASC' }

    return this
      .query(qb => {
        qb = this
          ._getQueryAll(paramsTemp, qb)
          .offset((paramsTemp.page - 1) * paramsTemp.pageSize)
          .limit(paramsTemp.pageSize)

        if (paramsTemp.distinct) {
          qb
            .select(knex.raw(`DISTINCT ON (${paramsTemp.distinct.join(',')}) *`))
            .orderBy(paramsTemp.distinct)
        }

        for (const attr in paramsTemp.orderBy)
          qb.orderBy(attr, paramsTemp.orderBy[attr] || 'ASC')
      })
      .fetchAll(fetchOptionsTemp)
  }

  /**
   * Returns the count of objects
   * @async
   *
   * @param {Object} params The `params` object to filter the attrs
   *
   * @return {Number} The count value
  */
  static async getCount(params) {
    const count = await this
      .query(qb => this._getQueryAll(params, qb))
      .count()

    return parseInt(count)
  }

  /**
   * Return one object
   * @async
   *
   * @param {Object} params The `params` object to filter the attrs
   *
   * @param {Object} fetchOptions The `bookshelf` fetch options (@see {@link https://bookshelfjs.org/api.html#Model-instance-fetch})
   *
   * @return {Object} The object found
  */
  static async getOne(params = {}, fetchOptions = {}) {
    const DEFAULT_PARAMS = {
      page      : 1,
      pageSize  : 1
    }

    params = Object
      .assign({}, DEFAULT_PARAMS, params)

    const models = await this
      .getAll(params, fetchOptions)

    return models.at(0)
  }

  static getAttributes(model) {
    let attributes = []

    if (model.visible && model.visible.length) {
      attributes = model.visible

      if (model.hidden && model.hidden.length)
        attributes = attributes.concat(model.hidden)
    }

    return attributes
  }

  static getQueryAll(params, model, queryBuilder, isWhere = true) {
    const queryBoolean = isWhere ?
      'where' :
      'orWhere'

    const attributes = GenericModel.getAttributes(model)

    if (!queryBuilder) {
      model.resetQuery()

      queryBuilder = Object
        .assign({}, model.query())
        .and
    }

    for (const param in params) {
      const whereObject = QueryBuilderUtils
        .getWhereObject(param, attributes)

      if (!attributes.length || attributes.indexOf(whereObject.attr) >= 0) {
        const attrName = `${model.tableName}.${whereObject.attr}`

        if (params[param] != null) {
          queryBuilder
            [`${queryBoolean}`](attrName, whereObject.operator, params[param])
        }
        else {
          queryBuilder
            [`${queryBoolean}Null`](attrName, params[param])
        }
      }
      else if (model._hasRelateds() && model.relateds.indexOf(whereObject.attr) >= 0 && typeof(params[param]) == 'object') {
        const related = GenericModel
          .getRelatedParams(whereObject.attr, model)

        const relatedQuery = GenericModel
          .getQueryAll(params[param], related.model, null, isWhere)
          .toString()
          .split('where')[1]

        queryBuilder
          .leftJoin(related.tableName, `${related.tableName}.${related.idAttribute}`, `${model.tableName}.${related.attrName}`)
          [`${queryBoolean}Raw`](relatedQuery)

        if (GenericModel._isRelatedManyToMany(whereObject.attr, model)) {
          const relatedManyToMany = GenericModel
            .getRelatedManyToManyParams(whereObject.attr, model)

          queryBuilder
            .leftJoin(relatedManyToMany.tableName, `${relatedManyToMany.tableName}.${relatedManyToMany.idAttribute}`, `${related.tableName}.${relatedManyToMany.attrName}`)
        }
      }
    }

    model.resetQuery()

    return queryBuilder
  }

  static getRelatedParams(relatedName, model) {
    return {
      tableName     : GenericModel._getRelatedTableName(relatedName, model),
      attrName      : GenericModel._getRelatedAttrName(relatedName, model),
      idAttribute   : GenericModel._getRelatedIdAttribute(relatedName, model),
      model         : GenericModel._getRelatedModel(relatedName, model)
    }
  }

  static getRelatedManyToManyParams(relatedName, model) {
    return {
      tableName     : GenericModel._getRelatedManyToManyTable(relatedName, model),
      attrName      : GenericModel._getRelatedManyToManyAttrName(relatedName, model),
      idAttribute   : GenericModel._getRelatedManyToManyIdAttribute(relatedName, model)
    }
  }

  /**
   * Returns whether it's persisted or not
   * @async
   *
   * @param {(string | Number | Object)} id The `id` value
   *
   * @return {Boolean} Whether it's persisted or not
  */
  static async isPersisted(id) {
    const params = id instanceof Object ?
      { ...id } :
      { id: id }

    const count = await this
      .where(params)
      .count()

    return count >= 1
  }

  static _getRelatedData(relatedName, model) {
    return model
      .related(relatedName)
      .relatedData
  }

  static _getRelatedModel(relatedName, model) {
    const relatedData = GenericModel
      ._getRelatedData(relatedName, model)

    return new relatedData
      .target()
  }

  static _getRelatedIdAttribute(relatedName, model) {
    const relatedModelData = GenericModel
      ._getRelatedData(relatedName, model)

    let idAttribute = relatedModelData.foreignKeyTarget

    if (!idAttribute) {
      if (relatedModelData.foreignKey)
        idAttribute = relatedModelData.targetIdAttribute
      else
        idAttribute = relatedModelData.key('foreignKey')
    }

    return idAttribute
  }

  static _getRelatedAttrName(relatedName, model) {
    const relatedModelData = GenericModel
      ._getRelatedData(relatedName, model)

    return relatedModelData.foreignKey || relatedModelData.parentIdAttribute
  }

  static _getRelatedTableName(relatedName, model) {
    const relatedModelData = GenericModel
      ._getRelatedData(relatedName, model)

    return GenericModel.
      _isRelatedManyToMany(relatedName, model) ?
      relatedModelData.joinTable() :
      relatedModelData.targetTableName
  }

  static _getRelatedManyToManyIdAttribute(relatedName, model) {
    const relatedModelData = GenericModel
      ._getRelatedData(relatedName, model)

    return relatedModelData.targetIdAttribute
  }

  static _getRelatedManyToManyAttrName(relatedName, model) {
    const relatedModelData = GenericModel
      ._getRelatedData(relatedName, model)

    return relatedModelData.key('otherKey')
  }

  /**
   * Returns the default `queryBuilder` query
   * @override
   *
   * @param {Object} params The `params` object
   * @param {string} params.genericSearch The `generic search` text
   * @param {Object} queryBuilder The `knex` `queryBuilder` object
   *
   * @return {Object} The `knex` `queryBuilder` object
  */
  static _getQueryAll(params, queryBuilder) {
    const modelInstance = Reflect.construct(this, [{}])

    queryBuilder = this
      .getQueryAll(params, modelInstance, queryBuilder)

    if (params.genericSearch) {
      queryBuilder = this
        ._getQueryGenericSearch(params.genericSearch, queryBuilder)
    }

    return queryBuilder
  }

  /**
   * Returns the `queryBuilder` query for `generic search`
   * @override
   *
   * @param {string} genericSearch The `generic search` text
   * @param {Object} queryBuilder The `knex` `queryBuilder` object
   *
   * @return {Object} The `knex` `queryBuilder` object
  */
  static _getQueryGenericSearch(genericSearch, queryBuilder) {
    return queryBuilder
  }

  static _getRelatedManyToManyTable(relatedName, model) {
    const relatedModelData = GenericModel
      ._getRelatedData(relatedName, model)

    return relatedModelData.targetTableName
  }

  static _isRelatedManyToMany(relatedName, model) {
    const relatedModelData = GenericModel
      ._getRelatedData(relatedName, model)

    return relatedModelData.isJoined()
  }
}

module.exports = GenericModel