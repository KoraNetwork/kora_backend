/**
 * Borrow.js
 *
 * @description :: Borrow Money model
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ UserService */

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

    guarantors: { collection: 'user' },

    fromAmount: { type: 'float', required: true },

    toAmount: { type: 'float', required: true },

    rate: { type: 'float', required: true },

    startDate: { type: 'date', required: true },

    maturityDate: { type: 'date', required: true },

    additionalNote: { type: 'string' }
  },

  indexes: [
    { attributes: { from: 1, updatedAt: -1 } },
    { attributes: { to: 1, updatedAt: -1 } },
    { attributes: { guarantors: 1, updatedAt: -1 } }
  ],

  beforeCreate: function (values, cb) {
    const { from, to, guarantors } = values;

    Promise.all([
      UserService.isFromToExists({from, to}),
      UserService.isUsersExists({users: guarantors, name: 'Guarantors'})
    ])
      .then(() => cb())
      .catch(err => cb(err));
  }
};
