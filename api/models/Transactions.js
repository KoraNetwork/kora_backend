/**
 * Transactions.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ sails ValidationService UserValidationService EthereumService */

const WLError = require('waterline/lib/waterline/error/WLError');

const types = {
  borrowFund: 'borrowFund',
  borrowPayBack: 'borrowPayBack',
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
    states,
    statesList,
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

    transactionHashes: { type: 'array', hexArray: true, defaultsTo: [] },

    additionalNote: { type: 'string' },

    loanId: { type: 'string' }, // For borrow transactions

    toJSON: function () {
      var obj = this.toObject();

      return obj;
    }
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

  beforeCreate: function (values, cb) {
    const {rawTransactions} = values;

    if (
      ~[types.send, types.request].indexOf(values.type) &&
      !(rawTransactions && rawTransactions.length)
    ) {
      return cb(new WLError({
        status: 400,
        reason: 'Parameter rawTransactions must be set and must have at least one element'
      }));
    }

    if (rawTransactions) {
      if (!(Array.isArray(rawTransactions) && rawTransactions.every(tx => ValidationService.hex(tx)))) {
        return cb(new WLError({reason: `Parameter 'rawTransactions' must be hex array`, status: 400}));
      }

      this.rawTransactions = rawTransactions;
      delete values.rawTransactions;
    }

    return cb();
  },

  afterCreate: function (record, cb) {
    if (this.rawTransactions) {
      const rawTransactions = this.rawTransactions;
      delete this.rawTransactions;

      Promise.all(
        rawTransactions.map(rawTransaction => EthereumService.sendSignedTransaction({
          rawTransaction,
          name: 'Token.transfer'
        }))
      )
        .then(
          receipts => {
            record.state = states.success;
            receipts.forEach(r => record.transactionHashes.push(r.transactionHash));

            return true;
          },
          err => {
            record.state = states.error;

            if (err.receipt) {
              record.transactionHashes.push(err.receipt.transactionHash);
            }

            return false;
          }
        )
        .then(() => this.update({id: record.id}, record))
        .then(updated => {
          // TODO: Add push here
          sails.log.info('Transaction saved:\n', updated[0]);
        })
        .catch(err => sails.log.error('Transaction save error:\n', err));
    }

    return cb();
  },

  findOnePopulate: function ({id, userId}, cb) {
    let promise = this.findOne({id})
      .populate('from')
      .populate('to');

    // Add direction
    if (userId) {
      promise.then(record => addDirection({record, userId}));
    }

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  findPopulate: function ({where, limit, skip, sort, userId}, cb) {
    let promise = this.find({where, limit, skip, sort})
      .populate('from')
      .populate('to');

    // Add direction
    if (userId) {
      promise.then(records => records.map(record => addDirection({record, userId})));
    }

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  }
};

function addDirection ({record, userId}) {
  if (record.from && record.from.id && record.from.id === userId) {
    record.direction = directions.from;
  } else if (record.to && record.to.id && record.to.id === userId) {
    record.direction = directions.to;
  }

  return record;
}
