'use strict'

const OPERATORS = [
  {
    name      : 'start',
    operator  : '>='
  },
  {
    name      : 'end',
    operator  : '<='
  },
  {
    name      : 'like',
    operator  : 'LIKE'
  },
  {
    name      : 'likeIgnoreCase',
    operator  : '~*'
  },
  {
    name      : 'in',
    operator  : 'IN'
  },
  {
    name      : 'not_in',
    operator  : 'NOT IN'
  },
  {
    name      : 'not',
    operator  : '<>'
  },
  {
    name      : 'jsonContains',
    operator  : '@>'
  }
]

/**
 * Contains a set of sql query builder utils
 * @class QueryBuilderUtils
*/
class QueryBuilderUtils {

  /**
   * The list of `operators`
   *
   * @constant
   * @type {Object}
   * @property {Object} operator The `operator` object
   * @property {string} operator.name The `operator`'s name
   * @property {string} operator.operator The operator value (ie. `=`, `>=`, `in`, etc)
  */
  static get OPERATORS()  { return OPERATORS }

  /**
    * Returns a list of `attrNames` concatened with each `operator` {@link QueryBuilderUtils.OPERATORS}
    *
    * @param {(Array | string)} attrNames The list of `attr` names
    *
    * @return {Array} The list of `attrsOperators`
    *
    * @example
    *
    * const attrNames = ['la', 'le', 'li']
    *
    * QueryBuilderUtils.getAttrsOperators(attrNames)
    * // ['la_start', 'la_end', ..., 'le_end', 'le_like', ..., 'li_likeIgnoreCase', 'li_in', ...]
    *
    * QueryBuilderUtils.getAttrsOperators('la')
    * // ['la_start', 'la_end', 'la_like', 'la_likeIgnoreCase', ...]
  */
  static getAttrsOperators(attrNames) {
    if (attrNames && !(attrNames instanceof Array))
      attrNames = [attrNames]

    const attrsOperators = []

    if (attrNames) {
      attrNames
        .forEach(attrName => {
          const attrOperators = QueryBuilderUtils
            .getAttrOperators(attrName)

          attrsOperators
            .push.apply(attrsOperators, attrOperators)
        })
    }

    return attrsOperators
  }

  /**
    * Returns a list of `attrName` concatened with each `operator` {@link QueryBuilderUtils.OPERATORS}
    *
    * @param {string} attrName The `attr` name
    *
    * @return {Array} The list of `attrOperators`
    *
    * @example
    *
    * const attrName = 'la'
    *
    * QueryBuilderUtils.getAttrOperators('la')
    * // ['la_start', 'la_end', 'la_like', 'la_likeIgnoreCase', ...]
    *
    * QueryBuilderUtils.getAttrOperators(null)
    * // []
  */
  static getAttrOperators(attrName) {
    let attrOperators = []

    if (attrName) {
      attrOperators = QueryBuilderUtils.OPERATORS
        .map(operator => `${attrName}_${operator.name}`)
    }

    return attrOperators
  }

  /**
    * Returns a list of `attrName` concatened with each `operator` {@link QueryBuilderUtils.OPERATORS}
    *
    * @param {string} attr The `attr` name (i.e. `id_start`, `name_like`, `phone_in`)
    * @param {Array<string>} attrs The `attrs` list
    *
    * @return {Array} The list of `attrOperators`
    *
    * @example
    * // const attrName = 'id'
    * // const attrs = [ 'id', 'name', 'phone', 'created_at' ]
    *
    * QueryBuilderUtils.getWhereObject(attrName, attrs)
    * //  {
    * //    attr      : 'id',
    * //    operator  : '='
    * //  }
    *
    *
    * // const attrName = 'created_at_start'
    * // const attrs = [ 'id', 'name', 'phone', 'created_at' ]
    *
    * QueryBuilderUtils.getWhereObject(attrName, attrs)
    * //  {
    * //    attr      : 'created_at',
    * //    operator  : '>='
    * //  }
    *
    *
    * // const attrName = 'name_like'
    * // const attrs = [ 'id', 'name', 'phone', 'created_at' ]
    *
    * QueryBuilderUtils.getWhereObject(attrName, attrs)
    * //  {
    * //    attr      : 'name',
    * //    operator  : 'LIKE'
    * //  }
  */
  static getWhereObject(attr, attrs = []) {
    const whereObject = {
      attr      : attr,
      operator  : '='
    }

    const operatorObject = QueryBuilderUtils
      .getOperatorObject(attr)

    if (attrs.indexOf(attr) < 0 && operatorObject) {
      whereObject.operator = operatorObject.operator

      whereObject.attr = QueryBuilderUtils
        .getAttrName(attr, operatorObject)
    }

    return whereObject
  }

  /**
   * Returns the [`operator` object]{@link QueryBuilderUtils.OPERATORS}
   *
   * @param {string} attr The `attrName` with `_operator` at the end
   *
   * @return {Object} The [`operator` object]{@link QueryBuilderUtils.OPERATORS}
  */
  static getOperatorObject(attr) {
    let operator = null

    const operators = OPERATORS
      .filter(OPERATOR => {
        const regex = QueryBuilderUtils
          ._getOperatorRegex(OPERATOR.name)

        return attr.match(regex)
      })

    if (operators.length)
      operator = operators.pop()

    return operator
  }

  static getAttrName(attr, operator) {
    let attrName = attr

    if (!operator)
      operator = QueryBuilderUtils.getOperatorObject(attr)

    if (operator) {
      const regex = QueryBuilderUtils
        ._getOperatorRegex(operator.name)

      attrName = attr.replace(new RegExp(regex), '')
    }

    return attrName
  }

  static _getOperatorRegex(attr) {
    return `(_(${attr}))$`
  }
}

module.exports = QueryBuilderUtils