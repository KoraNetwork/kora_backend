/**
 * WithdrawController
 *
 * @description :: Server-side logic for managing withdraws
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Withdraw Transactions ErrorService MiscService */

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
      Withdraw.findPopulate({ where, limit, skip, sort, userId }),
      Withdraw.count(where)
    ])
    .then(([data, total]) => res.json({data, total}))
    .catch(err => res.negotiate(err));
  },

  findOne: function (req, res) {
    let allParams = req.allParams();
    const userId = req.user.id;

    Withdraw.findOnePopulate({id: allParams.id, userId})
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

    Withdraw.create(allParams)
      .then(({id}) => Withdraw.findOnePopulate({id, userId}))
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  update: function (req, res) {
    let allParams = req.allParams();
    const {rejected} = Withdraw.constants.states;
    const userId = req.user.id;

    findValidRecord({id: allParams.id, userId})
      .then(record => {
        record.state = rejected;

        return new Promise((resolve, reject) => record.save(err => {
          if (err) {
            return reject(err);
          }

          return resolve(record);
        }));
      })
      .then(({id}) => Withdraw.findOnePopulate({id, userId}))
      .then(result => res.send(result))
      .catch(err => res.negotiate(err));
  },

  destroy: function (req, res) {
    let allParams = req.allParams();
    const userId = req.user.id;

    let cache = {};

    findValidRecord({id: allParams.id, userId})
      .then(record => {
        cache.record = record;

        const {from, to, fromAmount, toAmount, interestRate, additionalNote} = record;

        return Transactions.create({
          type: Transactions.constants.types.withdraw,
          from: to,
          to: from,
          fromAmount: MiscService.calcTotalAmount(toAmount, interestRate),
          toAmount: MiscService.calcTotalAmount(fromAmount, interestRate),
          interestRate,
          additionalNote,
          rawTransactions: allParams.rawTransactions
        });
      })
      .then(transaction => {
        cache.transaction = transaction;

        return Withdraw.destroy({id: cache.record.id});
      })
      .then(() => Transactions.findOnePopulate({id: cache.transaction.id, userId}))
      .then(transaction => ({
        message: 'Withdraw was confirmed and deleted. Transaction was created and sent',
        transaction
      }))
      .then(result => res.send(result))
      .catch(err => res.negotiate(err));
  },

  filters: function (req, res) {
    return res.json({
      state: Withdraw.constants.statesList,
      direction: Withdraw.constants.directionsList
    });
  }
};

function findValidRecord ({id, userId}) {
  const {rejected} = Withdraw.constants.states;

  return Withdraw.findOne({id})
    .then(request => {
      if (!request) {
        return Promise.reject(ErrorService.new({
          status: 404,
          message: 'Current withdraw not found'
        }));
      }

      if (request.to !== userId) {
        return Promise.reject(ErrorService.new({
          status: 400,
          message: `Current user must be in 'to' attribute of withdraw`
        }));
      }

      if (request.state === rejected) {
        return Promise.reject(ErrorService.new({
          status: 400,
          message: 'Current withdraw already rejected'
        }));
      }

      return Promise.resolve(request);
    });
}
