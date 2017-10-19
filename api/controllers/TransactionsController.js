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
    const {
      limit = 10,
      skip = 0
    } = req.allParams();
    const sort = 'updatedAt DESC';

    let where = {
      or: [
        { from: userId },
        { to: userId }
      ]
    };

    Promise.all([
      Transactions
        .find({ where, limit, skip, sort })
        .populate('from')
        .populate('to'),
      Transactions.count(where)
    ])
    .then(([data, total]) => res.json({data, total}))
    .catch(err => res.serverError(err));
  },

  create: function (req, res) {
    let allParams = req.allParams();

    allParams.from = req.user.id;
    allParams.fromAmount = parseFloat(allParams.fromAmount, 10);
    allParams.toAmount = parseFloat(allParams.toAmount, 10);

    Transactions.create(allParams)
      .then(result => res.ok(result))
      .catch(err => {
        // eslint-disable-next-line eqeqeq
        if (err.status == 400) {
          err.status = 422;

          return res.json(422, err);
        }

        return res.negotiate(err);
      });
  },

  types: function (req, res) {
    return res.json({
      list: Transactions.txTypesList,
      collection: Transactions.txTypes
    });
  }
};
