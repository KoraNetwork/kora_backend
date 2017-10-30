/**
 * Borrow.js
 *
 * @description :: Borrow Money model
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ UserValidationService */

const WLError = require('waterline/lib/waterline/error/WLError');

const states = {
  requested: 'requested',
  inProgress: 'inProgress',
  rejected: 'rejected'
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
    states,
    statesList,
    directions,
    directionsList
  },

  attributes: {
    state: {
      type: 'string',
      in: statesList,
      defaultsTo: states.requested
    },

    from: { model: 'user', required: true },

    to: { model: 'user', required: true },

    guarantor1: { model: 'user', required: true },

    guarantor2: { model: 'user' },

    guarantor3: { model: 'user' },

    fromAmount: { type: 'float', required: true },

    toAmount: { type: 'float', required: true },

    rate: { type: 'float', required: true, min: 0 },

    startDate: { type: 'date', required: true, after: new Date() },

    maturityDate: { type: 'date', required: true, after: new Date() },

    additionalNote: { type: 'string' }
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
  }
};
