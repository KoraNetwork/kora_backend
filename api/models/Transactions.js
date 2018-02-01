/**
 * Transactions.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ sails ValidationService UserValidationService TokensService ErrorService User CurrencyConvert */

const types = {
  send: 'send',
  request: 'request',
  borrowFund: 'borrowFund',
  borrowPayBack: 'borrowPayBack',
  deposit: 'deposit',
  withdraw: 'withdraw'
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

    interestRate: { type: 'float' }, // For deposit/withdraw

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
    const {rawTransaction, from, to, fromAmount, toAmount} = values;

    if (~[types.send, types.request, types.deposit, types.withdraw].indexOf(values.type)) {
      if (!(rawTransaction && ValidationService.hex(rawTransaction))) {
        return cb(ErrorService.new({
          status: 400,
          message: 'Parameter rawTransaction must be set and must be hex'
        }));
      }

      if (rawTransaction) {
        this.rawTransaction = rawTransaction;
        delete values.rawTransaction;
      }

      return User.find({id: [from, to]})
        .then(users => {
          if (users[0].currency === users[1].currency) {
            if (fromAmount !== toAmount) {
              return Promise.reject(ErrorService.new({
                status: 400,
                message: `Amounts must be equal`
              }));
            }

            return true;
          }

          return CurrencyConvert.destroy({from, to, fromAmount, toAmount})
            .then(records => {
              if (!records.length) {
                return Promise.reject(ErrorService.new({
                  status: 404,
                  message: 'Currency convertion for this transaction not found'
                }));
              }

              this.currencyConvert = records[0];

              return true;
            });
        })
        .then(() => cb())
        .catch(err => cb(err));
    }

    return cb();
  },

  afterCreate: function (record, cb) {
    if (this.rawTransaction) {
      const rawTransaction = this.rawTransaction;
      delete this.rawTransaction;

      const currencyConvert = this.currencyConvert;
      delete this.currencyConvert;

      User.findOne({id: record.from})
        .then(fromUser =>
          TokensService.sendSignedTransfer({
            rawTransaction,
            tokenAddress: fromUser.ERC20Token
          })
            .then(
              ({receipt, event}) => {
                // record.state = states.success;
                record.transactionHashes.push(receipt.transactionHash);

                return event;
              },
              err => {
                record.state = states.error;

                if (err.receipt) {
                  record.transactionHashes.push(err.receipt.transactionHash);
                }

                return false;
              }
            )
            .then(({_from, _to, _value}) => {
              console.log('_from, _to, _value', _from, _to, _value);
              if (fromUser.identity.toLowerCase() !== _from.toLowerCase()) {
                record.state = states.error;

                return false;
              }

              record.fromAmount = TokensService.convertValueToToken(_value);

              return User.findOne({id: record.to})
                .then(toUser => {
                  if (!currencyConvert) {
                    if (toUser.identity.toLowerCase() !== _to.toLowerCase()) {
                      record.state = states.error;

                      return false;
                    }

                    record.toAmount = record.fromAmount;

                    record.state = states.success;

                    return true;
                  }

                  if (_to.toLowerCase() !== sails.config.ethereum.koraWallet.address.toLowerCase()) {
                    record.state = states.error;

                    return false;
                  }

                  return TokensService.transferFromKora({
                    to: toUser.identity,
                    value: currencyConvert.toAmount,
                    tokenAddress: toUser.ERC20Token
                  })
                    .then(event => {
                      record.toAmount = currencyConvert.toAmount;

                      record.state = states.success;

                      return true;
                    });
                });
            })
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
