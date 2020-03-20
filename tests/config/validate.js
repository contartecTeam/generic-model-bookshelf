'use strict'

const moment = require('moment')
const validate = require('validate.js')

validate
  .extend(validate.validators.datetime, {
    parse: function(value) {
      return +moment
        .utc(value)
    },

    format: function(value, options) {
      var format = options.dateOnly ?
        'YYYY-MM-DD' : 'YYYY-MM-DD hh:mm:ss'

      return moment
        .utc(value)
        .format(format)
    }
  })