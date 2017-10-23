/**
 * Transactions.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ ValidationService User */

const WLError = require('waterline/lib/waterline/error/WLError');

const txTypes = {
  borrow: 'borrow',
  cash: 'cash',
  request: 'request',
  send: 'send'
};

const txTypesList = _.values(txTypes);

const directions = {
  from: 'from',
  to: 'to'
};

const directionsList = _.values(directions);

module.exports = {
  txTypes,

  txTypesList,

  directions,

  directionsList,

  attributes: {
    type: {
      type: 'string',
      in: txTypesList,
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

    Promise.all([
      User.findOne({id: from}),
      User.findOne({id: to})
    ])
      .then(([fromUser, toUser]) => {
        if (!fromUser) {
          return Promise.reject(new WLError({status: 404, reason: 'From user not exists'}));
        }

        if (!toUser) {
          return Promise.reject(new WLError({status: 404, reason: 'To user not exists'}));
        }

        return cb();
      })
      .catch(err => cb(err));
  }
};
