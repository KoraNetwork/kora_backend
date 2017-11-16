/**
 * Borrow.js
 *
 * @description :: Borrow Money model
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global sails ValidationService UserValidationService LendService */

const _ = require('lodash');

const WLError = require('waterline/lib/waterline/error/WLError');

const types = {
  request: 'request',
  loan: 'loan',
  inProgress: 'inProgress'
};
const typesList = _.values(types);

const states = {
  onGoing: 'onGoing',
  agreed: 'agreed',
  rejected: 'rejected',
  expired: 'expired',
  pending: 'pending',
  overdue: 'overdue'
};
const statesList = _.values(states);

const directions = {
  from: 'from',
  to: 'to',
  guarantor: 'guarantor'
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
    type: { type: 'string', in: typesList, defaultsTo: types.request },

    state: { type: 'string', in: statesList, defaultsTo: states.onGoing },

    from: { model: 'user', required: true },

    to: { model: 'user', required: true },

    guarantor1: { model: 'user', required: true },

    guarantor2: { model: 'user' },

    guarantor3: { model: 'user' },

    toAgree: { type: 'boolean' },

    guarantor1Agree: { type: 'boolean' },

    guarantor2Agree: { type: 'boolean' },

    guarantor3Agree: { type: 'boolean' },

    fromAmount: { type: 'float', required: true },

    toAmount: { type: 'float', required: true },

    interestRate: { type: 'float', required: true, min: 0 },

    startDate: { type: 'date', required: true, after: new Date() },

    maturityDate: { type: 'date', required: true, after: new Date() },

    additionalNote: { type: 'string' },

    loanId: { type: 'string' },

    transactionHashes: { type: 'array', hexArray: true },

    toJSON: function () {
      let obj = this.toObject();

      // Add direction
      if (sails.user) {
        const userId = sails.user.id;

        if (obj.from && obj.from.id && obj.from.id === userId) {
          obj.direction = directions.from;
        } else if (obj.to && obj.to.id && obj.to.id === userId) {
          obj.direction = directions.to;
        } else if (
          [1, 2, 3].some(n => {
            const guarantor = obj['guarantor' + n];
            return guarantor && guarantor.id && guarantor.id === userId;
          })
        ) {
          obj.direction = directions.guarantor;
        }
      }

      // Map guarantors and agree attributes
      obj.guarantors = [];

      ['to', 'guarantor1', 'guarantor2', 'guarantor3'].forEach(g => {
        if (obj[g]) {
          if (typeof obj[g + 'Agree'] !== 'undefined') {
            obj[g].agree = obj[g + 'Agree'];
          }

          if (g !== 'to') {
            obj.guarantors.push(obj[g]);
          }
        }
      });

      return obj;
    }
  },

  types: {
    hexArray: value => value.every(el => ValidationService.hex(el))
  },

  indexes: [
    { attributes: { from: 1, updatedAt: -1 } },
    { attributes: { to: 1, updatedAt: -1 } },
    { attributes: { guarantor1: 1, updatedAt: -1 } },
    {
      attributes: { guarantor2: 1, updatedAt: -1 },
      options: {
        partialFilterExpression: {guarantor2: {$exists: true}}
      }
    },
    {
      attributes: { guarantor3: 1, updatedAt: -1 },
      options: {
        partialFilterExpression: {guarantor3: {$exists: true}}
      }
    }
  ],

  beforeValidate: function (values, cb) {
    const { from, to, guarantor1, guarantor2, guarantor3, startDate, maturityDate } = values;

    if (Date.parse(startDate) >= Date.parse(maturityDate)) {
      return cb(new WLError({
        status: 400,
        reason: 'startDate could not be greater or equal then maturityDate'
      }));
    }

    let users = [from, to, guarantor1];
    let names = ['from', 'to', 'guarantor1'];

    if (guarantor2) {
      users.push(guarantor2);
      names.push('guarantor2');
    }

    if (guarantor3) {
      users.push(guarantor3);
      names.push('guarantor3');
    }

    Promise.all([
      UserValidationService.isIdsNotEqual({ids: users, names}),
      UserValidationService.isUsersExists({users, names})
    ])
      .then(() => cb())
      .catch(err => cb(err));
  },

  beforeUpdate: function (values, cb) {
    if (values.rawCreateLoan) {
      this.rawCreateLoan = values.rawCreateLoan;
      delete values.rawCreateLoan;
      values.state = states.pending;
    }

    return cb();
  },

  afterUpdate: function (record, cb) {
    if (!this.rawCreateLoan) {
      return cb();
    }

    if (!Array.isArray(record.transactionHashes)) {
      record.transactionHashes = [];
    }

    let rawCreateLoan = this.rawCreateLoan;
    delete this.rawCreateLoan;

    LendService.sendRawCreateLoan({rawCreateLoan})
      .then(receipt => {
        record.transactionHashes.push(receipt.transactionHash);
        record.state = states.onGoing;
        // record.loanId = receipt.events.LoanCreated.returnValues.loanId;
        ['to', 'guarantor1', 'guarantor2', 'guarantor3'].filter(k => record[k])
          .forEach(k => (record[k + 'Agree'] = null));

        this.update({id: record.id}, record)
          .then(updated => {
            // TODO: Add push here
            sails.log.info('Borrow money loan created and onGoing state saved:\n', updated[0]);
          })
          .catch(err => sails.log.error('Borrow money loan created and onGoing state save error:\n', err));
      })
      .catch(err => {
        sails.log.error('Borrow money create loan send error:\n', err);

        record.state = states.agreed;
        record.type = types.request;

        if (err.receipt) {
          record.transactionHashes.push(err.receipt.transactionHash);
        }

        this.update({id: record.id}, record).exec((err, updated) => {
          if (err) {
            return sails.log.error('Borrow money loan not created save error:\n', err);
          }
          // TODO: Add push here
          sails.log.info('Borrow money loan not created state saved:\n', updated[0]);
        });
      });

    return cb();
  }
};
