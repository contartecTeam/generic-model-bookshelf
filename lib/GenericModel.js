'use strict'

const { v4: uuidv4 } = require('uuid')
const validate = require('validate.js')
const ObjectUtils = require('@contartec-team/object-utils')

const QueryBuilderUtils = require('./utils/QueryBuilderUtils')

const bookshelf = global.bookshelfInstance
const knex = global.bookshelfInstance.knex

const DEFAULT_ATTRIBUTES = {
  requireFetch: false
}

/**
 * The `GenericModel` params
 *
 * @typedef GenericModelParams
 * @type {Object}
 * @memberof GenericModel
 *
 * @description A mix of `bookshelf` and custom options (override this with the desired one)
 *
 * @property {(string | Array<string>)} idAttribute The id attr name(s)
 * @property {Boolean} hasTimestamps Whether it has `created_at, updated_at, deleted_at, restored_at` or not
*/
const DEFAULT_GENERIC_MODEL_PARAMS = {
  idAttribute   : 'id',
  hasTimestamps : true
}

/**
 * Generic model for `bookshelf` ORM
 * @class GenericModel
 * @extends {bookshelf.Model}
*/
class GenericModel extends bookshelf.Model {

  /**
   * The `GenericModel` params
   * @description A mix of `bookshelf` and custom options (override this with the desired one)
   *
   * @type {GenericModelParams}
  */
  static get GENERIC_MODEL_PARAMS() { return {} }

  /**
   * The `GenericModel` params used internally
   *
   * @type {GenericModelParams}
  */
  static get MODEL_PARAMS() {
    return {
      ...this.DEFAULT_GENERIC_MODEL_PARAMS,
      ...this.GENERIC_MODEL_PARAMS
    }
  }

  /**
   * The default `GenericModel` params
   *
   * @type {GenericModelParams}
   *
   * @property {string} [idAttribute = 'id']
   * @property {Boolean} [hasTimestamps = true]
  */
  static get DEFAULT_GENERIC_MODEL_PARAMS() { return DEFAULT_GENERIC_MODEL_PARAMS }

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
   * The default `fetch` options for [`.getAll`]{@link GenericModel.getAll}
   * @override
   * @type {Object}
  */
  static get GET_ALL_DEFAULT_FETCH_OPTIONS() {
    return {
      withRelated: this.relateds
    }
  }

  /**
   * The default `fetch` options for [`.findById`]{@link GenericModel.findById}
   * @type {Object}
  */
  static get DEFAULT_FIND_BY_ID_FETCH_OPTIONS() {
    return {
      require: false
    }
  }

  /**
   * The default `fetch` options for [`.findById`]{@link GenericModel.findById}
   * @override
   * @type {Object}
  */
  static get FIND_BY_ID_DEFAULT_FETCH_OPTIONS() {
    return {
      ...this.DEFAULT_FIND_BY_ID_FETCH_OPTIONS
    }
  }

  /**
   * The internal default `fetch` options for [`.findById`]{@link GenericModel.findById}
   * @type {Object}
  */
  static get FIND_BY_ID_FETCH_OPTIONS() {
    return {
      ...this.DEFAULT_FIND_BY_ID_FETCH_OPTIONS,
      ...this.FIND_BY_ID_DEFAULT_FETCH_OPTIONS
    }
  }

  /**
   * The default filter params for [`.getCount`]{@link GenericModel.getCount}
   * @override
   * @type {Object}
  */
  static get COUNT_DEFAULT_PARAMS() {
    return {}
  }

  static get bookshelf()  { return bookshelf }
  static get knex()       { return bookshelf.knex }
  static get tableName()  { return this.MODEL_PARAMS.tableName }
  static get relateds()   { return this.MODEL_PARAMS.relateds }

  get tableName()     { return this._tableName }
  get idAttribute()   { return this._idAttribute || 'id' }
  get uuid()          { return this._uuid}
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

  /**
   * @deprecated Use `static get GENERIC_MODEL_PARAMS()` instead
   * @constructor
   * @param {GenericModelParams} properties The `model` properties
   * @param {Object} object The `model` object
  */
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

    this.bookshelfInitialize()
  }

  bookshelfInitialize() {
    this.on('saving', this.addUUID)

    this.constructor.__super__.initialize.apply(this, arguments)
  }

  getIdObject() {
    return !this._isCompositePrimaryKey() ?
      { [this.idAttribute]: this.id } :
      this.id
  }

  /**
   * Returns the `attr` formatted based on `.parse` ({@link https://bookshelfjs.org/tutorial-parse-and-format.html})
   *
   * @param {string} attr The `attr` name
   *
   * @return {string} The formatted attr
   *
   * @example
   * // const attr = 'created_at'
   *
   * model._getAttributeParsed(attr, type)
   * // created_at
   *
   *
   * // bookshelf.plugin('bookshelf-camelcase')
   * // const attr = 'created_at'
   *
   * model.getAttributeParsed(attr, type)
   * // createdAt
  */
  getAttributeParsed(attr) {
    return this
      ._getAttributeFormatted(attr, 'parse')
  }

  /**
   * Returns the `attr` formatted based on `.format` ({@link https://bookshelfjs.org/tutorial-parse-and-format.html})
   *
   * @param {string} attr The `attr` name
   *
   * @return {string} The formatted attr
   *
   * @example
   * // const attr = 'createdAt'
   *
   * model.getAttributeFormatted(attr)
   * // createdAt
   *
   *
   * // bookshelf.plugin('bookshelf-camelcase')
   * // const attr = 'createdAt'
   *
   * model.getAttributeFormatted(attr)
   * // created_at
  */
  getAttributeFormatted(attr) {
    return this
      ._getAttributeFormatted(attr, 'format')
  }

  /**
   * Returns the `model`'s attr names list
   *
   * @param {string} [formatType = 'parse'] `format` or `parse`
   *
   * @return {Array<string>} The `model`'s attrs
  */
  getAttributes(formatType = 'parse') {
    let attributes = []

    if (this._hasVisibleAttributes()) {
      attributes = this.visible

      if (this._hasHiddenAttributes())
        attributes = [ ...attributes, ...this.hidden ]

      attributes = attributes
        .map(a => this._getAttributeFormatted(a, formatType))
    }

    return attributes
  }

  getQueryAll(params, queryBuilder, isWhere) {
    return GenericModel
      .getQueryAll(params, this, queryBuilder, isWhere)
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

  isPersistedAsync() {
    return this.isPersisted()
  }

  isDeleted() {
    return this.get('deleted_at') > (this.get('restored_at') || null)
  }

  async areConstraintsValids() {
    const idParams = this.getIdObject()

    const constraintParams = this.
      _createObjectByArrayAttributes(this.constraints)

    const count = await this
      .query(qb => {
        qb
          .where(constraintParams)

        for (const attr in idParams)
          qb.andWhere(attr, '<>', idParams[attr] || 0)
      })
      .count()

    return count == 0
  }

  isObjectValid() {
    return this.validation() == null
  }

  isValid() {
    const isValid = false

    if (!this.isObjectValid())
      throw new Error(this.validation({ format: 'flat' }))

    return isValid
  }

  saveOrUpdate() {
    const self = this

    return new Promise((resolve, reject) => {
      return this
        .isPersistedAsync()
        .then(function(isPersisted) {
          return self
            ._save(!isPersisted)
            .then(resolve)
            .catch(reject)
        })
    })
  }

  addUUID() {
    if (this.uuid && !this.id) {
      const uuid = uuidv4()

      this.attributes[this.idAttribute] = uuid

      if (!this._isCompositePrimaryKey())
        this.id = uuid
    }
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

  delete() {
    const whereParams = this.getIdObject()

    let methodName = 'del'
    let methodParams = null

    if (this.soft) {
      methodName = 'update'

      methodParams = {
        deleted_at  : new Date(),
        updated_at  : new Date(),
        restored_at : null
      }
    }

    return this
      .query()
      .where(whereParams)
      [methodName](methodParams)
  }

  validation(format) {
    const object = this
      .toJSON({
        virtuals    : false,
        shallow     : true,
        formatType  : 'parse'
      })

    return validate(object, this._validationRules, format)
  }

  /**
   * Returns this `model` serialized
   *
   * @param {Object} [options = {}] The `bookshelf` `Model.seriealize` options ({@link https://bookshelfjs.org/api.html#Model-instance-serialize})
   * @param {string} options.formatType Whether it should return the object using `bookshelf`'s `.parse` (default) or `.format`
   *
   * @return {Object} The serialized model
  */
  serialize(options = { formatType: 'parse' }) {
    const optionsTemp = {
      ...this._SERIALIZE_OPTIONS,
      ...options
    }

    let json = super
      .serialize(optionsTemp)

    if (options.formatType) {
      json = {
        ...this[options.formatType](this.attributes),
        ...json
      }
    }

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
        delete json[this.getAttributeParsed(this.hidden[i])]
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

  /**
   * Returns the `attr` formatted based on `.format` or `.parse` ({@link https://bookshelfjs.org/tutorial-parse-and-format.html})
   *
   * @param {string} attr The `attr` name
   * @param {string} type The format type `format` (`database` side) or `parse` (client side)
   *
   * @return {string} The formatted attr
   *
   * @example
   * // const attr = 'created_at'
   * // const type = 'format'
   *
   * GenericModel._getAttributeFormatted(attr, type)
   * // created_at
   *
   *
   * // bookshelf.plugin('bookshelf-camelcase')
   * // const attr = 'createdAt'
   *
   * GenericModel._getAttributeFormatted(attr)
   * // created_at
   *
   *
   * // bookshelf.plugin('bookshelf-camelcase')
   * // const attr = 'created_at'
   * // const type = 'parse'
   *
   * GenericModel._getAttributeFormatted(attr, type)
   * // createdAt
  */
  _getAttributeFormatted(attr, type = 'format') {
    const formattedObject = this[type]({ [attr]: '' })

    let attrFormatted = null

    if (formattedObject && Object.keys(formattedObject).length > 0)
      attrFormatted = Object.keys(formattedObject)[0]

    return attrFormatted
  }

  _getAttributes(object) {
    let visibleAttributes = {}

    if (this._hasVisibleAttributes()) {
      const definedAttributes = [
        ...this.getAttributes(),
        ...this.getAttributes('format')
      ]

      for (const attr in object) {
        if (definedAttributes.indexOf(attr) >= 0 && object[attr] != undefined) {
          const attrName = this.getAttributeParsed(attr)

          visibleAttributes[attrName] = object[attr]
        }
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

    if (this._hasVisibleAttributes()) {
      const attrFormatted = this.getAttributeFormatted(attr)
      const attrParsed = this.getAttributeParsed(attr)

      hasAttr = this.visible
        .some(a => a == attrFormatted || a == attrParsed)
    }

    return hasAttr
  }

  _hasHiddenAttribute(attr) {
    let hasAttr = false

    if (this._hasHiddenAttributes()){
      const attrFormatted = this.getAttributeFormatted(attr)
      const attrParsed = this.getAttributeParsed(attr)

      hasAttr = this.hidden
        .some(a => a == attrFormatted || a == attrParsed)
    }

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

    this._virtuals = { ...virtuals }

    if (object && this._hasVisibleAttributes()) {
      for (const virtualName in attrsNotDefined) {
        this
          .setVirtual(virtualName, attrsNotDefined[virtualName])
      }
    }

    return this
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

  _save(isNew = true) {
    let params = {}

    if (isNew)
      params = { method: 'insert' }

    return this
      .save(null, params)
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

    if (typeof(paramsTemp.groupBy) == 'string')
      paramsTemp.groupBy = [paramsTemp.groupBy]

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

        if (paramsTemp.groupBy && paramsTemp.groupBy instanceof Array) {
          paramsTemp.groupBy
            .forEach(attr => qb.groupBy(attr))
        }
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
    const paramsTemp = { ...this.COUNT_DEFAULT_PARAMS, ...params }

    const queryBuilder = this
      .query(qb => {
        qb = this
          ._getQueryAll(paramsTemp, qb)

        if (paramsTemp.countDistinct)
          qb.countDistinct(paramsTemp.countDistinct)
      })

    let count = 0

    if (paramsTemp.countDistinct) {
      const result = await queryBuilder.fetch(this.FIND_BY_ID_FETCH_OPTIONS)

      count = parseInt(result.get('count'))
    }
    else
      count = await queryBuilder.count(this.FIND_BY_ID_FETCH_OPTIONS)

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
    const paramsTemp = {
      ...params,
      page      : 1,
      pageSize  : 1
    }

    const models = await this
      .getAll(paramsTemp, fetchOptions)

    return models.at(0)
  }

  /**
   * Returns the model by id
   *
   * @param {*} id The id attr
   * @param {Object} [options] The `bookshelf` fetch options
   *
   * @return {Promise<Object>} The model
  */
  static findById(id, options = {}) {
    const fetchParams = typeof(id) == 'object' ?
      { ...id } :
      { [this.MODEL_PARAMS.idAttribute]: id }

    const fetchOptions = {
      ...this.FIND_BY_ID_FETCH_OPTIONS,
      ...options
    }

    return this
      .where(fetchParams)
      .fetch(fetchOptions)
  }

  /**
   * Returns the `attr` formatted based on `.parse` ({@link https://bookshelfjs.org/tutorial-parse-and-format.html})
   *
   * @param {string} attr The `attr` name
   * @param {Object} [model] The `model` instance
   *
   * @return {string} The formatted attr
   *
   * @example
   * // const attr = 'created_at'
   *
   * GenericModel._getAttributeParsed(attr, type)
   * // created_at
   *
   *
   * // bookshelf.plugin('bookshelf-camelcase')
   * // const attr = 'created_at'
   *
   * GenericModel.getAttributeParsed(attr, type)
   * // createdAt
  */
  static getAttributeParsed(attr, model) {
    return this
      ._getAttributeFormatted(attr, 'parse', model)
  }

  /**
   * Returns the `attr` formatted based on `.format` ({@link https://bookshelfjs.org/tutorial-parse-and-format.html})
   *
   * @param {string} attr The `attr` name
   * @param {Object} [model] The `model` instance
   *
   * @return {string} The formatted attr
   *
   * @example
   * // const attr = 'createdAt'
   *
   * GenericModel.getAttributeFormatted(attr)
   * // createdAt
   *
   *
   * // bookshelf.plugin('bookshelf-camelcase')
   * // const attr = 'createdAt'
   *
   * GenericModel.getAttributeFormatted(attr)
   * // created_at
  */
  static getAttributeFormatted(attr, model) {
    return this
      ._getAttributeFormatted(attr, 'format', model)
  }

  /**
   * Returns the `visible` and `hidden` attrs list
   *
   * @param {Object} [model] The `model` instance
   *
   * @return {Array<string>} The `model`'s attrs list
  */
  static getAttributes(model) {
    const modelTemp = model || Reflect.construct(this, [{}])

    let attributes = []

    if (modelTemp.visible && modelTemp.visible.length) {
      attributes = modelTemp.visible

      if (modelTemp.hidden && modelTemp.hidden.length)
        attributes = [ ...attributes, ...modelTemp.hidden ]

      attributes = attributes
        .map(a => this.getAttributeParsed(a, modelTemp))
    }

    return attributes
  }

  /**
   * Returns the `where` object (@see {@link QueryBuilderUtils.getWhereObject})
   *
   * @param {string} param The `filter` param
   * @param {Object} model The `model` instance
   *
   * @return {Object} The `where` object
   *
   * @example
   * // const param = 'id'
   * // const attrs = [ 'id', 'name', 'phone', 'created_at' ]
   *
   * GenericModel.getWhereObject(param, attrs)
   * //  {
   * //    attr      : 'id',
   * //    operator  : '='
   * //  }
   *
   *
   * // const param = 'created_at_start'
   * // const attrs = [ 'id', 'name', 'phone', 'created_at' ]
   *
   * GenericModel.getWhereObject(param, attrs)
   * //  {
   * //    attr      : 'created_at',
   * //    operator  : '>='
   * //  }
   *
   *
   * // const param = 'name_like'
   * // const attrs = [ 'id', 'name', 'phone', 'created_at' ]
   *
   * GenericModel.getWhereObject(param, attrs)
   * //  {
   * //    attr      : 'name',
   * //    operator  : 'LIKE'
   * //  }
  */
  static getWhereObject(param, model) {
    const modelTemp = model || Reflect.construct(this, [{}])
    const attributes = GenericModel.getAttributes(modelTemp)

    const whereObject = QueryBuilderUtils
      .getWhereObject(param, attributes)

    const attr = this.getAttributeFormatted(whereObject.attr)

    return { ...whereObject, attr }
  }

  /**
   * Returns the `queryBuilder` object with filters applied
   *
   * @param {Object} params The `filter` params
   * @param {Object} model This `model` instance
   * @param {Object} queryBuilder The `knex` `queryBuilder` object
   * @param {Boolean} isWhere Whether `params` should use `AND` or `OR`
   *
   * @return {Object} The `queryBuilder` with the filters applied
  */
  static getQueryAll(params, model, queryBuilder, isWhere = true) {
    const queryBoolean = isWhere ?
      'where' :
      'orWhere'

    if (!queryBuilder) {
      model.resetQuery()

      queryBuilder = Object
        .assign({}, model.query())
        .and
    }

    for (const param in params) {
      const whereObject = this
        .getWhereObject(param, model)

      if (model._hasAttribute(whereObject.attr)) {
        const attrName = `${model.tableName}.${whereObject.attr}`

        if (params[param] != null) {
          if ((whereObject.operator == 'NOT IN' || whereObject.operator == 'IN') && params[param] && !Array.isArray(params[param]))
            params[param] = [params[param]]

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
      { [this.MODEL_PARAMS.idAttribute]: id }

    const count = await this
      .where(params)
      .count()

    return count >= 1
  }

  /**
   * Returns the `attr` formatted based on `.format` or `.parse` ({@link https://bookshelfjs.org/tutorial-parse-and-format.html})
   *
   * @param {string} attr The `attr` name
   * @param {string} type The format type `format` (`database` side) or `parse` (client side)
   * @param {Object} model The `model` instance
   *
   * @return {string} The formatted attr
   *
   * @example
   * // const attr = 'created_at'
   * // const type = 'format'
   *
   * GenericModel._getAttributeFormatted(attr, type)
   * // created_at
   *
   *
   * // bookshelf.plugin('bookshelf-camelcase')
   * // const attr = 'createdAt'
   *
   * GenericModel._getAttributeFormatted(attr)
   * // created_at
   *
   *
   * // bookshelf.plugin('bookshelf-camelcase')
   * // const attr = 'created_at'
   * // const type = 'parse'
   *
   * GenericModel._getAttributeFormatted(attr, type)
   * // createdAt
  */
  static _getAttributeFormatted(attr, type = 'format', model = undefined) {
    const modelTemp = model || Reflect.construct(this, [{}])

    return modelTemp._getAttributeFormatted(attr, type)
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