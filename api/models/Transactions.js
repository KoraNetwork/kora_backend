/**
 * Transactions.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ sails ValidationService UserValidationService TokensService */

const types = {
  borrow: 'borrow',
  cash: 'cash',
  request: 'request',
  send: 'send'
};
const typesList = _.values(types);

const states = {
  pending: 'pending',
  success: 'success',
  error: 'error'
};
const statesList = _.values(states);

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
    type: { type: 'string', in: typesList, required: true },

    state: { type: 'string', in: statesList, defaultsTo: states.pending },

    from: { model: 'user', required: true },

    to: { model: 'user', required: true },

    fromAmount: { type: 'float', required: true },

    toAmount: { type: 'float', required: true },

    rawTransactions: { type: 'array', hexArray: true },

    transactionHashes: { type: 'array', hexArray: true },

    additionalNote: { type: 'string' }
  },

  types: {
    hexArray: value => value.every(el => ValidationService.hex(el))
  },

  indexes: [
    { attributes: { from: 1, updatedAt: -1 } },
    { attributes: { to: 1, updatedAt: -1 } }
  ],

  beforeValidate: function (values, cb) {
    const { from, to } = values;

    Promise.all([
      UserValidationService.isFromToNotEqual({from, to}),
      UserValidationService.isFromToExists({from, to})
    ])
      .then(() => cb())
      .catch(err => cb(err));
  },

  afterCreate: function (record, cb) {
    const { rawTransactions } = record;

    if (!(rawTransactions && rawTransactions.length)) {
      return cb();
    }

    record.transactionHashes = [];

    Promise.all(
      rawTransactions.map(rawTransaction => TokensService.transferSignedRawTx({rawTransaction}))
    )
      .then(receipts => {
        receipts.forEach(r => record.transactionHashes.push(r.transactionHash));
        record.state = states.success;
        record.save(err => {
          if (err) {
            return sails.log.error('Transaction success state save error:\n', err);
          }
          // TODO: Add push here
          sails.log.info('Transaction success state saved:\n', record);
        });
      })
      .catch(err => {
        sails.log.error('Signed raw transaction send error:\n', err);
        record.state = states.error;
        record.save(err => {
          if (err) {
            return sails.log.error('Transaction error state save error:\n', err);
          }
          // TODO: Add push here
          sails.log.info('Transaction error state saved:\n', record);
        });
      });

    return cb();
  }
};
