/**
 * TransactionsController
 *
 * @description :: Server-side logic for managing transactions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Transactions */

module.exports = {
  find: function (req, res) {
    const userId = req.user.id;
    const sort = 'updatedAt DESC';
    const {
      direction,
      type,
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
    .then(([data, total]) => {
      data.forEach(el => {
        if (el.from && el.from.id === userId) {
          el.direction = Transactions.constants.directions.from;
        }

        if (el.to && el.to.id === userId) {
          el.direction = Transactions.constants.directions.to;
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

    Transactions.create(allParams)
      .then(({id}) => Transactions.findOne({id}).populate('from').populate('to'))
      .then(result => {
        result.direction = Transactions.constants.directions.from;
        return res.ok(result);
      })
      .catch(err => res.negotiate(err));
  },

  types: function (req, res) {
    return res.json({
      list: Transactions.constants.typesList,
      collection: Transactions.constants.types
    });
  },

  filters: function (req, res) {
    return res.json({
      type: Transactions.constants.typesList,
      direction: Transactions.constants.directionsList
    });
  }
};
