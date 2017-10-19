/**
 * TransactionsController
 *
 * @description :: Server-side logic for managing transactions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Transactions */

module.exports = {
  index: function (req, res) {
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

  types: function (req, res) {
    return res.json({
      list: Transactions.txTypesList,
      collection: Transactions.txTypes
    });
  }
};
