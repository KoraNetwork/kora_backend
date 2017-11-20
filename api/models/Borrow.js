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

    transactionHashes: { type: 'array', hexArray: true, defaultsTo: [] },

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

    if (values.rawAgreeLoan) {
      this.rawAgreeLoan = values.rawAgreeLoan;
      delete values.rawAgreeLoan;
      values.state = states.pending;
    }

    return cb();
  },

  afterUpdate: function (record, cb) {
    if (this.rawCreateLoan) {
      let rawCreateLoan = this.rawCreateLoan;
      delete this.rawCreateLoan;

      LendService.sendRawCreateLoan({rawCreateLoan})
        .then(({receipt, event}) => {
          record.transactionHashes.push(receipt.transactionHash);
          record.loanId = event.returnValues.loanId;
          record.state = states.onGoing;
          ['to', 'guarantor1', 'guarantor2', 'guarantor3'].filter(k => record[k])
            .forEach(k => (record[k + 'Agree'] = null));

          return this.update({id: record.id}, record);
        })
        .catch(err => {
          record.state = states.agreed;
          record.type = types.request;

          if (err.receipt) {
            record.transactionHashes.push(err.receipt.transactionHash);
          }

          return this.update({id: record.id}, record);
        })
        .then(updated => {
          // TODO: Add push here
          sails.log.info('Borrow money after KoraLend.createLoan tx saved:\n', updated[0]);
        })
        .catch(err => sails.log.error('Borrow money after KoraLend.createLoan tx save error:\n', err));
    }

    if (this.rawAgreeLoan) {
      let rawAgreeLoan = this.rawAgreeLoan;
      delete this.rawAgreeLoan;

      let guarantorIdentity;

      LendService.sendRawAgreeLoan({rawAgreeLoan})
        .then(({receipt, event}) => {
          record.transactionHashes.push(receipt.transactionHash);

          // eslint-disable-next-line eqeqeq
          if (record.loanId != event.returnValues.loanId) {
            let err = new Error('Borrow record and GuarantorAgreed event loanIds not equals');
            sails.log.error(err);
            return Promise.reject(err);
          }

          guarantorIdentity = event.returnValues.guarantor;

          return this.findOnePopulate({id: record.id});
        })
        .then(populatedRecord => {
          let guarantorKey = ['guarantor1', 'guarantor2', 'guarantor3'].filter(k => record[k])
            .find(k => populatedRecord[k].identity === guarantorIdentity);

          if (!guarantorKey) {
            let err = new Error(`Borrow record not has guarantor with identity equal GuarantorAgreed event guarantor`);
            sails.log.error(err);
            return Promise.reject(err);
          }

          record[guarantorKey + 'Agree'] = true;

          if (
            ['guarantor1', 'guarantor2', 'guarantor3'].filter(k => record[k])
              .every(k => record[k + 'Agree'])
          ) {
            record.state = states.agreed;
          } else {
            record.state = states.onGoing;
          }

          return this.update({id: record.id}, record);
        })
        .catch(err => {
          record.state = states.onGoing;

          if (err.receipt) {
            record.transactionHashes.push(err.receipt.transactionHash);
          }

          return this.update({id: record.id}, record);
        })
        .then(updated => {
          // TODO: Add push here
          sails.log.info('Borrow money after KoraLend.agreeLoan tx saved:\n', updated[0]);
        })
        .catch(err => sails.log.error('Borrow money after KoraLend.agreeLoan tx save error:\n', err));
    }

    return cb();
  },

  findOnePopulate: function ({id}, cb) {
    let promise = this.findOne({id})
      .populate('from')
      .populate('to')
      .populate('guarantor1')
      .populate('guarantor2')
      .populate('guarantor3');

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  }
};
