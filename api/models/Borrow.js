/**
 * Borrow.js
 *
 * @description :: Borrow Money model
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ UserService */

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
  guarantors: 'guarantors'
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

    guarantors: { collection: 'user', required: true, guarantorsLength: true },

    fromAmount: { type: 'float', required: true },

    toAmount: { type: 'float', required: true },

    rate: { type: 'float', required: true, min: 0 },

    startDate: { type: 'date', required: true, after: new Date() },

    maturityDate: { type: 'date', required: true, after: new Date() },

    additionalNote: { type: 'string' }
  },

  types: {
    guarantorsLength: value => value && value.length && value.length <= 3
  },

  indexes: [
    { attributes: { from: 1, updatedAt: -1 } },
    { attributes: { to: 1, updatedAt: -1 } },
    { attributes: { guarantors: 1, updatedAt: -1 } }
  ],

  beforeValidate: function (values, cb) {
    const { from, to, guarantors, startDate, maturityDate } = values;
    console.log(values);

    if (Date.parse(startDate) >= Date.parse(maturityDate)) {
      return cb(new WLError({
        status: 400,
        reason: 'startDate could not be greater or equal then maturityDate'
      }));
    }

    Promise.all([
      UserService.isFromToNotEqual({from, to}),
      UserService.isUserNotInUsers({user: from, users: guarantors, userName: 'From', usersName: 'guarantors'}),
      UserService.isUserNotInUsers({user: to, users: guarantors, userName: 'To', usersName: 'guarantors'}),
      UserService.isFromToExists({from, to}),
      UserService.isUsersExists({users: guarantors, name: 'Guarantors'})
    ])
      .then(() => cb())
      .catch(err => cb(err));
  }
};
