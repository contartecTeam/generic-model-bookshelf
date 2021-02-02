'use strict'

const QueryBuilderUtils = require('../../lib/utils/QueryBuilderUtils')

describe('QueryBuilderUtils', () => {
  describe('.getOperatorObject', () => {
    context('when there\'s a operator appended in attr name', () => {
      QueryBuilderUtils.OPERATORS
        .forEach(OPERATOR => {
          it(`should return the operator object for ${OPERATOR.name}`, () => {
            const operatorObject = OPERATOR
            const attr = `lepra_attr_${operatorObject.name}`

            const operatorObjectTemp = QueryBuilderUtils
              .getOperatorObject(attr)

            expect(operatorObjectTemp).to.eql(operatorObject)
          })
        })

      context('when operator name is not at the end of attr name', () => {
        it('should return null', () => {
          const operatorObject = QueryBuilderUtils.OPERATORS[0]
          const attr = `lepra_${operatorObject.name}_attr`

          const operatorObjectTemp = QueryBuilderUtils
            .getOperatorObject(attr)

          expect(operatorObjectTemp).to.not.exist
        })
      })
    })

    context('when there\'s no operator appended in attr name', () => {
      it('should return null', () => {
        const attr = 'lepra_attr'

        const operatorObjectTemp = QueryBuilderUtils
          .getOperatorObject(attr)

        expect(operatorObjectTemp).to.not.exist
      })
    })
  })

  describe('.getAttrName', () => {
    context('when there\'s a operator appended in attr name', () => {
      it('should return the real attr name', () => {
        const operatorObject = QueryBuilderUtils.OPERATORS[0]
        const attrName = 'lepra_attr'
        const attr = `${attrName}_${operatorObject.name}`

        const attrNameTemp = QueryBuilderUtils
          .getAttrName(attr)

        expect(attrNameTemp).to.eql(attrName)
      })

      context('and it is not at the end of attr name', () => {
        it('should return the real attr name', () => {
          const operatorObject = QueryBuilderUtils.OPERATORS[0]
          const attr = `lepra_${operatorObject.name}_attr`

          const attrNameTemp = QueryBuilderUtils
            .getAttrName(attr)

          expect(attrNameTemp).to.eql(attr)
        })
      })
    })

    context('when there\'s no operator appended in attr name', () => {
      it('should return the attr name', () => {
        const attr = 'lepra_attr'

        const attrNameTemp = QueryBuilderUtils
          .getAttrName(attr)

        expect(attrNameTemp).to.eql(attr)
      })
    })
  })

  describe('.getWhereObject', () => {
    const DEFAULT_ATTRS = [
      'lepra',
      'sera',
      'tosca'
    ]

    context('when there\'s a operator appended in attr name', () => {
      let operatorObject, attrName, attr, whereObject, ATTRS

      before(() => {
        operatorObject = QueryBuilderUtils.OPERATORS[1]

        ATTRS = [`${DEFAULT_ATTRS[0]}_${operatorObject.name}`]
          .concat(DEFAULT_ATTRS)

        attrName = ATTRS[0]
        attr = `${attrName}_${operatorObject.name}`

        whereObject = QueryBuilderUtils
          .getWhereObject(attr, ATTRS)
      })

      it('should return the object with "attr" belonging to the passed array', () => {
        expect(whereObject.attr).to.eql(attrName)
      })

      it('should return the correspondent "operator"', () => {
        expect(whereObject.operator).to.eql(operatorObject.operator)
      })
    })

    context('when there\'s no operator appended in attr name', () => {
      let attrName, whereObject, ATTRS

      before(() => {
        const operatorObject = QueryBuilderUtils.OPERATORS[1]

        ATTRS = [`${DEFAULT_ATTRS[0]}_${operatorObject.name}`]
          .concat(DEFAULT_ATTRS)

        attrName = ATTRS[0]

        whereObject = QueryBuilderUtils
          .getWhereObject(attrName, ATTRS)
      })

      it('should return the object with "attr" belonging to the passed array', () => {
        expect(whereObject.attr).to.eql(attrName)
      })

      it('should return the object with "operator" equals "="', () => {
        expect(whereObject.operator).to.eql('=')
      })
    })
  })

  describe('.getAttrOperators', () => {
    context('when `attrName` is not `null`', () => {
      const ATTR_NAME = 'arpel'

      let attrOperators

      before(() => {
        attrOperators = QueryBuilderUtils
          .getAttrOperators(ATTR_NAME)
      })

      it('should return a list of `attrName` concatened with each `operator`', () => {
        const attrOperatorTemp = QueryBuilderUtils.OPERATORS
          .map(o => `${ATTR_NAME}_${o.name}`)

        expect(attrOperators).to.eql(attrOperatorTemp)
      })
    })

    context('when `attrName` is `null`', () => {
      const ATTR_NAME = null

      let attrOperators

      before(() => {
        attrOperators = QueryBuilderUtils
          .getAttrOperators(ATTR_NAME)
      })

      it('should return a list of `attrName` concatened with each `operator`', () => {
        expect(attrOperators).to.have.lengthOf(0)
      })
    })
  })

  describe('.getAttrsOperators', () => {
    context('when `attrNames` is an `Array`', () => {
      const ATTR_NAMES = ['arpel', 'la', 're']

      let attrsOperators

      before(() => {
        attrsOperators = QueryBuilderUtils
          .getAttrsOperators(ATTR_NAMES)
      })

      it('should return a list of `attrNames` concatened with each `operator`', () => {
        const attrsOperatorsTemp = []

        ATTR_NAMES
          .forEach(attrNames => {
            const attrOperators = QueryBuilderUtils.OPERATORS
              .map(o => `${attrNames}_${o.name}`)

            attrsOperatorsTemp
              .push.apply(attrsOperatorsTemp, attrOperators)
          })

        expect(attrsOperators).to.eql(attrsOperatorsTemp)
      })
    })

    context('when `attrNames` is an `String`', () => {
      const ATTR_NAMES = 'arpel'

      let attrOperators

      before(() => {
        attrOperators = QueryBuilderUtils
          .getAttrsOperators(ATTR_NAMES)
      })

      it('should return a list of `attrNames` concatened with each `operator`', () => {
        const attrOperatorTemp = QueryBuilderUtils.OPERATORS
          .map(o => `${ATTR_NAMES}_${o.name}`)

        expect(attrOperators).to.eql(attrOperatorTemp)
      })
    })

    context('when `attrNames` is `null`', () => {
      const ATTR_NAMES = null

      let attrOperators

      before(() => {
        attrOperators = QueryBuilderUtils
          .getAttrOperators(ATTR_NAMES)
      })

      it('should return a list of `attrNames` concatened with each `operator`', () => {
        expect(attrOperators).to.have.lengthOf(0)
      })
    })
  })
})