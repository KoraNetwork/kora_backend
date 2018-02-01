/**
 * Borrow.js
 *
 * @description :: Borrow Money model
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global ValidationService UserValidationService ErrorService MiscService BorrowService */

const _ = require('lodash');

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
    type: { type: 'string', in: typesList, defaultsTo: types.request, required: true },

    state: { type: 'string', in: statesList, defaultsTo: states.onGoing, required: true },

    from: { model: 'user', required: true },

    to: { model: 'user', required: true },

    guarantor1: { model: 'user', required: true },

    guarantor2: { model: 'user' },

    guarantor3: { model: 'user' },

    toAgree: { type: 'boolean' },

    guarantor1Agree: { type: 'boolean' },

    guarantor2Agree: { type: 'boolean' },

    guarantor3Agree: { type: 'boolean' },

    fromAmount: { type: 'float', required: true, min: 0 },

    toAmount: { type: 'float', required: true, min: 0 },

    interestRate: { type: 'float', required: true, min: 0 },

    startDate: { type: 'date', required: true },

    maturityDate: { type: 'date', required: true },

    additionalNote: { type: 'string' },

    loanId: { type: 'string' },

    fromBalance: { type: 'float', min: 0 },

    toBalance: { type: 'float', min: 0 },

    transactionHashes: { type: 'array', hexArray: true, defaultsTo: [] },

    toJSON: function () {
      let obj = this.toObject();

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

      // Additional values
      obj.fromTotalAmount = MiscService.calcTotalAmount(obj.fromAmount, obj.interestRate);
      obj.toTotalAmount = MiscService.calcTotalAmount(obj.toAmount, obj.interestRate);

      obj.fromReturnedMoney = obj.fromBalance ? obj.fromTotalAmount - obj.fromBalance : 0;
      obj.toReturnedMoney = obj.toBalance ? obj.toTotalAmount - obj.toBalance : 0;

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

    if (Date.parse(startDate) + 24 * 60 * 60 * 1000 > Date.parse(maturityDate)) {
      return cb(ErrorService.new({
        status: 400,
        message: 'Maturity date must be greater than start date at least by one day'
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

  beforeCreate: function (values, cb) {
    const { startDate } = values;

    if (Date.parse(startDate) < Date.now()) {
      return cb(ErrorService.new({
        status: 400,
        message: 'Start date must be in future'
      }));
    }

    return cb();
  },

  beforeUpdate: function (values, cb) {
    ['rawCreateLoan', 'rawAgreeLoan', 'rawApproves', 'rawFundLoan', 'rawPayBackLoan'].forEach(rawTx => {
      if (values[rawTx]) {
        this[rawTx] = values[rawTx];
        delete values[rawTx];
        values.state = states.pending;
      }
    });

    return cb();
  },

  afterUpdate: function (record, cb) {
    if (this.rawCreateLoan) {
      BorrowService.sendRawCreateLoan({rawCreateLoan: this.rawCreateLoan, record});

      delete this.rawCreateLoan;
    }

    if (this.rawAgreeLoan) {
      BorrowService.sendRawAgreeLoan({rawAgreeLoan: this.rawAgreeLoan, record});

      delete this.rawAgreeLoan;
    }

    if (this.rawApproves && (this.rawFundLoan || this.rawPayBackLoan)) {
      BorrowService.sendRawLoanTransfer({
        rawApproves: this.rawApproves,
        rawFundLoan: this.rawFundLoan,
        rawPayBackLoan: this.rawPayBackLoan,
        record
      });

      delete this.rawApproves;
      delete this.rawFundLoan;
      delete this.rawPayBackLoan;
    }

    return cb();
  },

  findOnePopulate: function ({id, userId}, cb) {
    let promise = this.findOne({id})
      .populate('from')
      .populate('to')
      .populate('guarantor1')
      .populate('guarantor2')
      .populate('guarantor3');

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
      .populate('to')
      .populate('guarantor1')
      .populate('guarantor2')
      .populate('guarantor3');

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
  } else if (
    [1, 2, 3].some(n => {
      const guarantor = record['guarantor' + n];
      return guarantor && guarantor.id && guarantor.id === userId;
    })
  ) {
    record.direction = directions.guarantor;
  }

  return record;
}
