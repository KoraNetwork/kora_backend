/**
 * Requests.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ UserService */

const states = {
  inProgress: 'inProgress',
  rejected: 'rejected'
};
const statesList = _.values(states);

module.exports = {
  constants: {
    states,
    statesList
  },

  attributes: {
    state: {
      type: 'string',
      in: statesList,
      defaultsTo: states.inProgress
    },

    from: { model: 'user', required: true },

    to: { model: 'user', required: true },

    fromAmount: { type: 'float', required: true },

    toAmount: { type: 'float', required: true },

    additionalNote: { type: 'string' }
  },

  indexes: [
    { attributes: { from: 1, updatedAt: -1 } },
    { attributes: { to: 1, updatedAt: -1 } }
  ],

  beforeCreate: function (values, cb) {
    const { from, to } = values;

    values.state = states.inProgress;

    UserService.isFromToExists({from, to})
      .then(() => cb())
      .catch(err => cb(err));
  }
};
