'use strict'

const GenericModel = require('../../lib/GenericModel')

class GenericRelatedPersisted extends GenericModel {
  constructor (object) {
    super(GenericRelatedPersisted.DEFAULT_ATTRIBUTES, object)
  }

  static get VALIDATION_RULES() {
    return {
      name  : {
        presence  : true,
        length    : {
          maximum : 255
        }
      }
    }
  }

  static get DEFAULT_ATTRIBUTES() {
    return {
      tableName         : 'generic_related_persisteds',
      hasTimestamps     : true,
      soft              : true,
      idAttribute       : 'id',

      visible           : ['id', 'parent', 'name'],

      hidden            : ['created_at', 'updated_at', 'deleted_at', 'restored_at'],

      validationRules   : GenericRelatedPersisted.VALIDATION_RULES
    }
  }

  static get tableName()                  { return GenericRelatedPersisted.DEFAULT_ATTRIBUTES.tableName }
  static get relateds()                   { return GenericRelatedPersisted.DEFAULT_ATTRIBUTES.relateds }

  get tableName()     { return GenericRelatedPersisted.DEFAULT_ATTRIBUTES.tableName }
  get idAttribute()   { return GenericRelatedPersisted.DEFAULT_ATTRIBUTES.idAttribute }
}
module.exports = bookshelfInstance.model('GenericRelatedPersisted', GenericRelatedPersisted)