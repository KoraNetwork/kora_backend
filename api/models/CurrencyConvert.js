/**
 * CurrencyConvert.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const {constants: {types: {send}}} = require('./Transactions');

/* global _ */
const types = {
  [send]: send,
  request: 'request',
  borrow: 'borrow',
  deposit: 'deposit',
  withdraw: 'withdraw'
};
const typesList = _.values(types);

module.exports = {
  constants: {
    types,
    typesList
  },

  attributes: {
    type: { type: 'string', in: typesList, required: true },

    from: { model: 'user', required: true },

    to: { model: 'user', required: true },

    exchangeRate: { type: 'float', required: true },

    fromAmount: { type: 'float', required: true },

    toAmount: { type: 'float', required: true }
  },

  indexes: [
    {
      attributes: { from: 1, to: 1, type: 1 },
      options: { unique: true }
    }
  ]
};
