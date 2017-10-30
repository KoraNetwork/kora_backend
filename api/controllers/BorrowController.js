/**
 * BorrowController
 *
 * @description :: Server-side logic for managing borrows
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Borrow */

module.exports = {
  find: function (req, res) {
    const directions = Borrow.constants.directions;
    const userId = req.user.id;
    const sort = 'updatedAt DESC';
    const {direction, state, limit = 10, skip = 0} = req.allParams();

    let where = {
      or: [
        { from: userId },
        { to: userId },
        { guarantor1: userId },
        { guarantor2: userId },
        { guarantor3: userId }
      ]
    };

    if (state) {
      where.state = state;
    }

    if (direction) {
      // If direction  will be Array
      let directions = Array.isArray(direction) ? direction : [direction];

      directions.forEach(d => {
        if (d === directions.guarantor) {
          [1, 2, 3].forEach(n => (where[d + n] = userId));
        } else {
          where[d] = userId;
        }
      });
    }

    Promise.all([
      Borrow
        .find({where, limit, skip, sort})
        .populate('from')
        .populate('to')
        .populate('guarantor1')
        .populate('guarantor2')
        .populate('guarantor3'),
      Borrow.count(where)
    ])
      .then(([data, total]) => {
        data.forEach(el => {
          if (el.from && el.from.id && el.from.id === userId) {
            el.direction = directions.from;
          }

          if (el.to && el.to.id && el.to.id === userId) {
            el.direction = directions.to;
          }

          if (
            [1, 2, 3].some(n => {
              const guarantor = el[directions.guarantor + n];
              return guarantor && guarantor.id && guarantor.id === userId;
            })
          ) {
            el.direction = directions.guarantor;
          }
        });

        return {data, total};
      })
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  create: function (req, res) {
    let allParams = req.allParams();

    allParams.from = req.user.id;
    allParams.fromAmount = parseFloat(allParams.fromAmount, 10);
    allParams.toAmount = parseFloat(allParams.toAmount, 10);
    allParams.rate = parseFloat(allParams.rate, 10);

    Borrow.create(allParams)
      .then(({id}) => Borrow.findOne({id})
        .populate('from')
        .populate('to')
        .populate('guarantor1')
        .populate('guarantor2')
        .populate('guarantor3')
    )
      .then(result => {
        result.direction = Borrow.constants.directions.from;
        return res.ok(result);
      })
      .catch(err => res.negotiate(err));
  },

  filters: function (req, res) {
    return res.json({
      state: Borrow.constants.statesList,
      direction: Borrow.constants.directionsList
    });
  }
};
