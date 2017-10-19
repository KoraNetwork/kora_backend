/**
 * Transactions.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ ValidationService */

const txTypes = {
  borrow: 'borrow',
  cash: 'cash',
  request: 'request',
  send: 'send'
};

const txTypesList = _.values(txTypes);

module.exports = {
  txTypes,

  txTypesList,

  attributes: {
    type: {
      type: 'string',
      in: txTypesList,
      defaultsTo: txTypes.send
    },

    from: { model: 'user' },

    to: { model: 'user' },

    fromAmount: { type: 'number' },

    toAmount: { type: 'number' },

    transactionHash: { type: 'string', address: true }
  },

  types: {
    address: value => ValidationService.address(value)
  }
};
