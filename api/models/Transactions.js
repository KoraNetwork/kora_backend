/**
 * Transactions.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ ValidationService UserValidationService */

const types = {
  borrow: 'borrow',
  cash: 'cash',
  request: 'request',
  send: 'send'
};
const typesList = _.values(types);

const directions = {
  from: 'from',
  to: 'to'
};
const directionsList = _.values(directions);

module.exports = {
  constants: {
    types,
    typesList,
    directions,
    directionsList
  },

  attributes: {
    type: {
      type: 'string',
      in: typesList,
      required: true
    },

    from: { model: 'user', required: true },

    to: { model: 'user', required: true },

    fromAmount: { type: 'float', required: true },

    toAmount: { type: 'float', required: true },

    transactionHash: { type: 'array', hexArray: true, required: true },

    additionalNote: { type: 'string' }
  },

  types: {
    hexArray: value => value.every(el => ValidationService.hex(el))
  },

  indexes: [
    { attributes: { from: 1, updatedAt: -1 } },
    { attributes: { to: 1, updatedAt: -1 } }
  ],

  beforeCreate: function (values, cb) {
    const { from, to } = values;

    UserValidationService.isFromToExists({from, to})
      .then(() => cb())
      .catch(err => cb(err));
  }
};
