'use strict'

const GenericModel = require('../../lib/GenericModel')

class GenericClassRelated extends GenericModel {
  constructor (object) {
    super(GenericClassRelated.DEFAULT_ATTRIBUTES, object)
  }

  static get VALIDATION_RULES() {
    return {
      vehicle_id  : {
        presence  : true
      },
      organization_id : {
        presence  : true
      },
      date  : {
        presence: true
      }
    }
  }

  static get DEFAULT_ATTRIBUTES() {
    return {
      tableName         : 'generic_class_relateds',
      hasTimestamps     : true,
      soft              : false,
      idAttribute       : 'id',

      visible           : [
        'id',
        'code',
        'service_id',
        'vehicle_id',
        'service_recurrency_id',
        'driver_id',
        'collector_id',
        'organization_id',
        'date',
        'start_date',
        'end_date',
        'tickets_sold',
        'timezone',
        'free_tickets'
      ],

      hidden            : ['created_at', 'updated_at', 'deleted_at', 'restored_at'],

      constraints       : ['date', 'service_id'],

      validationRules   : GenericClassRelated.VALIDATION_RULES
    }
  }

  static get tableName()                  { return GenericClassRelated.DEFAULT_ATTRIBUTES.tableName }
  static get relateds()                   { return GenericClassRelated.DEFAULT_ATTRIBUTES.relateds }

  get tableName()     { return GenericClassRelated.DEFAULT_ATTRIBUTES.tableName }
  get idAttribute()   { return GenericClassRelated.DEFAULT_ATTRIBUTES.idAttribute }
}

module.exports = bookshelfInstance.model('GenericClassRelated', GenericClassRelated)