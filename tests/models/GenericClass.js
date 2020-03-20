'use strict'

const GenericModel = require('../../lib/GenericModel')


class GenericClass extends GenericModel {
  constructor (object) {
    super(GenericClass.DEFAULT_ATTRIBUTES, object)
  }

  static get VALIDATION_RULES() {
    return {
      name  : {
        presence  : true,
        length    : {
          maximum : 255
        }
      },
      organization_id : {
        presence  : true
      }
    }
  }

  static get DEFAULT_ATTRIBUTES() {
    return {
      tableName         : 'generic_classes',
      hasTimestamps     : true,
      soft              : true,
      idAttribute       : 'id',

      visible           : ['cpf', 'name', 'role', 'id', 'enrollment', 'organization_id',],

      hidden            : ['created_at', 'updated_at', 'deleted_at', 'restored_at'],

      relateds          : ['generic_related_persisted'],

      constraints       : ['cpf', 'organization_id', 'enrollment', 'role'],

      validationRules   : GenericClass.VALIDATION_RULES,

      generic_related_persisted      : function() {
        return this.belongsTo('GenericRelatedPersisted', 'organization_id')
      },

      virtuals          : {
        virtualProperty : function() {
          return `${this.id}-${this.get('cpf')}`
        }
      }
    }
  }

  static get tableName()                  { return GenericClass.DEFAULT_ATTRIBUTES.tableName }
  static get relateds()                   { return GenericClass.DEFAULT_ATTRIBUTES.relateds }

  get tableName()     { return GenericClass.DEFAULT_ATTRIBUTES.tableName }
  get idAttribute()   { return GenericClass.DEFAULT_ATTRIBUTES.idAttribute }
}

module.exports = GenericClass