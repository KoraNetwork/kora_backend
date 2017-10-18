/**
 * Transactions.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const types = {
  // borrow: 'borrow',
  send: 'send',
  cash: 'cash'
};

module.exports = {
  types,

  attributes: {
    type: {
      type: 'string',
      in: [types.send, types.cash],
      defaultsTo: types.send
    },

    from: { model: 'user' },

    to: { model: 'user' },

    fromAmount: { type: 'number' },

    toAmount: { type: 'number' }

    // Maybe add some tx data
  }
};
