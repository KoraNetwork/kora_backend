/**
 * RequestsController
 *
 * @description :: Server-side logic for managing requests
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Requests */

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
        if (el.from && el.from.id === userId) {
          el.direction = Requests.constants.directions.from;
        }

        if (el.to && el.to.id === userId) {
          el.direction = Requests.constants.directions.to;
        }
      });

      return res.json({data, total});
    })
    .catch(err => res.serverError(err));
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
      .catch(err => {
        // eslint-disable-next-line eqeqeq
        if (err.status == 400) {
          err.status = 422;
          return res.json(422, err);
        }

        return res.negotiate(err);
      });
  },

  update: function (req, res) {
    let allParams = req.allParams();
    const {rejected} = Requests.constants.states;

    Requests.findOne({id: allParams.id})
      .then(record => {
        if (record.to !== req.user.id) {
          return res.send(422, {
            message: `Current user must be in 'to' attribute of request`
          });
        }

        if (record.state === rejected) {
          return res.send(422, {
            message: 'Current request for money already rejected'
          });
        }

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
      .catch(err => res.serverError(err));
  },

  filters: function (req, res) {
    return res.json({
      state: Requests.constants.statesList,
      direction: Requests.constants.directionsList
    });
  }
};
