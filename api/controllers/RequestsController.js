/**
 * RequestsController
 *
 * @description :: Server-side logic for managing requests
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Requests Transactions ErrorService */

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
      Requests.findPopulate({ where, limit, skip, sort, userId }),
      Requests.count(where)
    ])
      .then(([data, total]) => res.json({data, total}))
      .catch(err => res.negotiate(err));
  },

  findOne: function (req, res) {
    let allParams = req.allParams();
    const userId = req.user.id;

    Requests.findOnePopulate({id: allParams.id, userId})
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  create: function (req, res) {
    let allParams = req.allParams();
    const userId = req.user.id;

    allParams.from = userId;
    allParams.fromAmount = parseFloat(allParams.fromAmount, 10);
    allParams.toAmount = parseFloat(allParams.toAmount, 10);

    Requests.create(allParams)
      .then(({id}) => Requests.findOnePopulate({id, userId}))
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  update: function (req, res) {
    let allParams = req.allParams();
    const {rejected} = Requests.constants.states;
    const userId = req.user.id;

    findRequest({id: allParams.id, userId})
      .then(record => {
        record.state = rejected;

        return new Promise((resolve, reject) => record.save(err => {
          if (err) {
            return reject(err);
          }

          return resolve(record);
        }));
      })
      .then(({id}) => Requests.findOnePopulate({id, userId}))
      .then(result => res.send(result))
      .catch(err => res.negotiate(err));
  },

  destroy: function (req, res) {
    let allParams = req.allParams();
    const userId = req.user.id;
    let values = {
      rawTransaction: allParams.rawTransaction
    };

    allParams.fromAmount = parseFloat(allParams.fromAmount, 10);
    allParams.toAmount = parseFloat(allParams.toAmount, 10);

    if (!isNaN(allParams.fromAmount)) {
      values.toAmount = allParams.fromAmount;
    }

    if (!isNaN(allParams.toAmount)) {
      values.fromAmount = allParams.toAmount;
    }

    findRequest({id: allParams.id, userId})
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
      .then(({id}) => Transactions.findOnePopulate({id, userId}))
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

function findRequest ({id, userId}) {
  const {rejected} = Requests.constants.states;

  return Requests.findOne({id})
    .then(request => {
      if (!request) {
        return Promise.reject(ErrorService.new({
          status: 404,
          message: 'Current request for money not found'
        }));
      }

      if (request.to !== userId) {
        return Promise.reject(ErrorService.new({
          status: 400,
          message: `Current user must be in 'to' attribute of request`
        }));
      }

      if (request.state === rejected) {
        return Promise.reject(ErrorService.new({
          status: 400,
          message: 'Current request for money already rejected'
        }));
      }

      return Promise.resolve(request);
    });
}
