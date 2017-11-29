/**
 * DepositController
 *
 * @description :: Server-side logic for managing deposits
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Deposit Transactions */

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

      directions.forEach(d => (where[d] = userId));
    }

    Promise.all([
      Deposit.findPopulate({ where, limit, skip, sort, userId }),
      Deposit.count(where)
    ])
    .then(([data, total]) => res.json({data, total}))
    .catch(err => res.negotiate(err));
  },

  findOne: function (req, res) {
    let allParams = req.allParams();
    const userId = req.user.id;

    Deposit.findOnePopulate({id: allParams.id, userId})
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  create: function (req, res) {
    let allParams = req.allParams();
    const userId = req.user.id;

    allParams.from = userId;
    allParams.fromAmount = parseFloat(allParams.fromAmount, 10);
    allParams.toAmount = parseFloat(allParams.toAmount, 10);
    allParams.interestRate = parseFloat(allParams.interestRate, 10);

    Deposit.create(allParams)
      .then(({id}) => Deposit.findOnePopulate({id, userId}))
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  update: function (req, res) {
    let allParams = req.allParams();
    const {rejected} = Deposit.constants.states;
    const userId = req.user.id;

    findValidDeposit({id: allParams.id, userId})
      .then(record => {
        record.state = rejected;

        return new Promise((resolve, reject) => record.save(err => {
          if (err) {
            return reject(err);
          }

          return resolve(record);
        }));
      })
      .then(({id}) => Deposit.findOnePopulate({id, userId}))
      .then(result => res.send(result))
      .catch(err => res.negotiate(err));
  },

  destroy: function (req, res) {
    let allParams = req.allParams();
    const userId = req.user.id;

    let cache = {};

    findValidDeposit({id: allParams.id, userId})
      .then(record => {
        cache.record = record;

        const {from, to, fromAmount, toAmount, interestRate, additionalNote} = record;

        return Transactions.create({
          type: Transactions.constants.types.deposit,
          from: to,
          to: from,
          fromAmount: toAmount,
          toAmount: fromAmount,
          interestRate,
          additionalNote,
          rawTransactions: allParams.rawTransactions
        });
      })
      .then(transaction => {
        cache.transaction = transaction;

        return Deposit.destroy({id: cache.record.id});
      })
      .then(() => Transactions.findOnePopulate({id: cache.transaction.id, userId}))
      .then(transaction => ({
        message: 'Deposit was confirmed and deleted. Transaction was created and sent',
        transaction
      }))
      .then(result => res.send(result))
      .catch(err => res.negotiate(err));
  },

  filters: function (req, res) {
    return res.json({
      state: Deposit.constants.statesList,
      direction: Deposit.constants.directionsList
    });
  }
};

function findValidDeposit ({id, userId}) {
  const {rejected} = Deposit.constants.states;

  return Deposit.findOne({id})
    .then(request => {
      if (!request) {
        return Promise.reject(new WLError({
          status: 404,
          message: 'Current deposit not found'
        }));
      }

      if (request.to !== userId) {
        return Promise.reject(new WLError({
          status: 400,
          message: `Current user must be in 'to' attribute of deposit`
        }));
      }

      if (request.state === rejected) {
        return Promise.reject(new WLError({
          status: 400,
          message: 'Current deposit already rejected'
        }));
      }

      return Promise.resolve(request);
    });
}
