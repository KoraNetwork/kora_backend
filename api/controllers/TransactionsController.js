/**
 * TransactionsController
 *
 * @description :: Server-side logic for managing transactions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Transactions */

module.exports = {
  find: function (req, res) {
    const userId = req._sails.user.id;
    const sort = 'updatedAt DESC';
    const {
      direction,
      type,
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

    if (type) {
      where.type = type;
    }

    if (state) {
      where.state = state;
    }

    if (direction) {
      // If direction accidentally will be Array
      let directions = Array.isArray(direction) ? direction : [direction];

      directions.forEach(el => (where[el] = userId));
    }

    Promise.all([
      Transactions
        .find({ where, limit, skip, sort })
        .populate('from')
        .populate('to'),
      Transactions.count(where)
    ])
    .then(([data, total]) => res.json({data, total}))
    .catch(err => res.negotiate(err));
  },

  create: function (req, res) {
    let allParams = req.allParams();

    allParams.from = req._sails.user.id;
    allParams.fromAmount = parseFloat(allParams.fromAmount, 10);
    allParams.toAmount = parseFloat(allParams.toAmount, 10);

    Transactions.create(allParams)
      .then(({id}) => Transactions.findOne({id}).populate('from').populate('to'))
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  filters: function (req, res) {
    return res.json({
      direction: Transactions.constants.directionsList,
      type: Transactions.constants.typesList,
      state: Transactions.constants.statesList
    });
  }
};
