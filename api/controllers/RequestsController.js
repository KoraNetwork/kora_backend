/**
 * RequestsController
 *
 * @description :: Server-side logic for managing requests
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Requests Transactions */

const WLError = require('waterline/lib/waterline/error/WLError');

module.exports = {
  find: function (req, res) {
    const userId = req.user.id;
    const sort = 'updatedAt DESC';
    const {
      direction,
      state,
      limit = 10,
      skip = 0
    } = req.allParams();

    let where = {
      or: [
        { from: userId },
        { to: userId }
      ]
    };

    if (state) {
      where.state = state;
    }

    if (direction) {
      // If direction accidentally will be Array
      let directions = Array.isArray(direction) ? direction : [direction];

      directions.forEach(el => (where[el] = userId));
    }

    Promise.all([
      Requests
        .find({ where, limit, skip, sort })
        .populate('from')
        .populate('to'),
      Requests.count(where)
    ])
    .then(([data, total]) => {
      data.forEach(el => {
        if (el.from && el.from.id && el.from.id === userId) {
          el.direction = Requests.constants.directions.from;
        }

        if (el.to && el.to.id && el.to.id === userId) {
          el.direction = Requests.constants.directions.to;
        }
      });

      return res.json({data, total});
    })
    .catch(err => res.negotiate(err));
  },

  create: function (req, res) {
    let allParams = req.allParams();

    allParams.from = req.user.id;
    allParams.fromAmount = parseFloat(allParams.fromAmount, 10);
    allParams.toAmount = parseFloat(allParams.toAmount, 10);

    Requests.create(allParams)
      .then(({id}) => Requests.findOne({id}).populate('from').populate('to'))
      .then(result => {
        result.direction = Requests.constants.directions.from;
        return res.ok(result);
      })
      .catch(err => res.negotiate(err));
  },

  update: function (req, res) {
    let allParams = req.allParams();
    const {rejected} = Requests.constants.states;

    findRequest({id: allParams.id, user: req.user})
      .then(record => {
        record.state = rejected;

        return new Promise((resolve, reject) => record.save(err => {
          if (err) {
            return reject(err);
          }

          return resolve(record);
        }));
      })
      .then(({id}) => Requests.findOne({id}).populate('from').populate('to'))
      .then(result => res.send(result))
      .catch(err => res.negotiate(err));
  },

  destroy: function (req, res) {
    let allParams = req.allParams();
    let values = {
      rawTransactions: allParams.rawTransactions
    };

    allParams.fromAmount = parseFloat(allParams.fromAmount, 10);
    allParams.toAmount = parseFloat(allParams.toAmount, 10);

    if (!isNaN(allParams.fromAmount)) {
      values.toAmount = allParams.fromAmount;
    }

    if (!isNaN(allParams.toAmount)) {
      values.fromAmount = allParams.toAmount;
    }

    findRequest({id: allParams.id, user: req.user})
      .then(request => {
        const {from, to, fromAmount, toAmount, additionalNote} = request;

        return Transactions.create(Object.assign({
          type: Transactions.constants.types.request,
          from: to,
          to: from,
          fromAmount: toAmount,
          toAmount: fromAmount,
          additionalNote
        }, values))
          .then(transaction => ({transaction, request}));
      })
      .then(({transaction, request}) => Requests.destroy({id: request.id})
            .then(() => transaction)
      )
      .then(({id}) => Transactions.findOne({id}).populate('from').populate('to'))
      .then(transaction => ({
        message: 'Request for money was confirmed and deleted. Transaction was created and sent',
        transaction
      }))
      .then(result => res.send(result))
      .catch(err => res.negotiate(err));
  },

  filters: function (req, res) {
    return res.json({
      state: Requests.constants.statesList,
      direction: Requests.constants.directionsList
    });
  }
};

function findRequest ({id, user}) {
  const {rejected} = Requests.constants.states;

  return Requests.findOne({id})
    .then(request => {
      if (!request) {
        return Promise.reject(new WLError({
          status: 404,
          message: 'Current request for money not found'
        }));
      }

      if (request.to !== user.id) {
        return Promise.reject(new WLError({
          status: 400,
          message: `Current user must be in 'to' attribute of request`
        }));
      }

      if (request.state === rejected) {
        return Promise.reject(new WLError({
          status: 400,
          message: 'Current request for money already rejected'
        }));
      }

      return Promise.resolve(request);
    });
}
