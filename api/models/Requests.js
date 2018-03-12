/**
 * Requests.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ UserValidationService CurrencyConvert ErrorService User */

const states = {
  inProgress: 'inProgress',
  rejected: 'rejected'
};
const statesList = _.values(states);

const directions = {
  from: 'from',
  to: 'to'
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
      defaultsTo: states.inProgress
    },

    from: { model: 'user', required: true },

    to: { model: 'user', required: true },

    fromAmount: { type: 'float', required: true },

    toAmount: { type: 'float', required: true },

    additionalNote: { type: 'string' },

    toJSON: function () {
      var obj = this.toObject();

      return obj;
    }
  },

  indexes: [
    { attributes: { from: 1, updatedAt: -1 } },
    { attributes: { to: 1, updatedAt: -1 } }
  ],

  afterValidate: function (values, cb) {
    const { from, to } = values;

    if (from && to) {
      return Promise.all([
        UserValidationService.isFromToNotEqual({from, to}),
        UserValidationService.isFromToExists({from, to})
      ])
        .then(() => cb())
        .catch(err => cb(err));
    }

    return cb();
  },

  beforeCreate: function (values, cb) {
    const {from, to, fromAmount, toAmount} = values;

    values.state = states.inProgress;

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

        return CurrencyConvert.destroy({type: CurrencyConvert.constants.types.request, from, to, fromAmount, toAmount})
          .then(records => {
            if (!records.length) {
              return Promise.reject(ErrorService.new({
                status: 404,
                message: 'Currency convertion for this request not found'
              }));
            }

            return true;
          });
      })
      .then(() => cb())
      .catch(err => cb(err));
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
