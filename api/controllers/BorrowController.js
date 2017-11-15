/**
 * BorrowController
 *
 * @description :: Server-side logic for managing borrows
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Borrow */

const WLError = require('waterline/lib/waterline/error/WLError');

module.exports = {
  find: function (req, res) {
    const directions = Borrow.constants.directions;
    const userId = req._sails.user.id;
    const sort = 'updatedAt DESC';
    let {
      direction,
      type,
      state,
      limit = 10,
      skip = 0
    } = req.allParams();

    type = req.options.type || type;

    let where = {
      or: [
        { from: userId },
        { to: userId },
        { guarantor1: userId },
        { guarantor2: userId },
        { guarantor3: userId }
      ]
    };

    if (type) {
      where.type = type;
    }

    if (state) {
      where.state = state;
    }

    if (direction) {
      // If direction will be Array
      direction = Array.isArray(direction) ? direction : [direction];

      direction.forEach(d => {
        if (d === directions.guarantor) {
          where.or = where.or.filter(el => !el.from && !el.to);
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
      .then(([data, total]) => ({data, total}))
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  create: function (req, res) {
    let allParams = req.allParams();

    allParams.from = req._sails.user.id;
    allParams.fromAmount = parseFloat(allParams.fromAmount, 10);
    allParams.toAmount = parseFloat(allParams.toAmount, 10);
    allParams.interestRate = parseFloat(allParams.interestRate, 10);

    Borrow.create(allParams)
      .then(({id}) => findBorrowPopulate({id}))
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  update: function (req, res) {
    const types = Borrow.constants.types;
    const states = Borrow.constants.states;
    let allParams = req.allParams();

    findBorrow({id: allParams.id, user: req._sails.user})
      .then(({borrow, participant}) => {
        const {to, guarantor1, guarantor2, guarantor3} = borrow;

        switch (borrow.type) {
          case types.request:
            switch (borrow.state) {
              case states.onGoing:
                let {agree} = allParams;

                if (participant === 'from') {
                  return Promise.reject(new WLError({message: 'Borrow money not agreed', status: 400}));
                }

                if (typeof borrow[participant + 'Agree'] === 'boolean') {
                  return Promise.reject(new WLError({message: 'User already did agreement', status: 400}));
                }

                if (typeof agree === 'undefined') {
                  return res.badRequest(new WLError({message: `Parameter 'agree' must be set`, status: 400}));
                }

                agree = (typeof agree === 'string') ? agree !== 'false' : !!agree;

                borrow[participant + 'Agree'] = agree;

                if (!agree) {
                  borrow.state = states.rejected;
                } else if (Object.keys({to, guarantor1, guarantor2, guarantor3}).every(k => borrow[k + 'Agree'])) {
                  borrow.state = states.agreed;
                }

                break;

              // case states.agreed:
              //   let {rawCreateLoan} = allParams;
              //
              //   if (participant !== 'from') {
              //     return Promise.reject(new WLError({message: 'Borrow money already agreed', status: 400}));
              //   }
              //
              //   if (!rawCreateLoan) {
              //     return res.badRequest(new WLError({message: `Parameter 'rawCreateLoan' must be set`, status: 400}));
              //   }
              //
              //   borrow.type = types.loan;
              //   borrow.state = states.pending;
              //
              //   break;

              default:
                return Promise.reject(new WLError({
                  message: 'Not implemented yet',
                  status: 404
                }));
            }

            break;

          default:
            return Promise.reject(new WLError({
              message: 'Not implemented yet',
              status: 404
            }));
        }

        return new Promise((resolve, reject) => borrow.save(err => {
          if (err) {
            return reject(err);
          }
          return resolve(borrow);
        }));
      })
      .then(({id}) => findBorrowPopulate({id}))
      .then(result => res.send(result))
      .catch(err => res.negotiate(err));
  },

  filters: function (req, res) {
    return res.json({
      type: Borrow.constants.typesList,
      state: Borrow.constants.statesList,
      direction: Borrow.constants.directionsList
    });
  }
};

function findBorrowPopulate ({id}) {
  return Borrow.findOne({id})
    .populate('from')
    .populate('to')
    .populate('guarantor1')
    .populate('guarantor2')
    .populate('guarantor3');
}

function findBorrow ({id, user}) {
  const {rejected, expired, overdue} = Borrow.constants.states;

  return Borrow.findOne({id})
    .then(borrow => {
      if (!borrow) {
        return Promise.reject(new WLError({
          status: 404,
          message: 'Current borrow money not found'
        }));
      }

      const {from, to, guarantor1, guarantor2, guarantor3} = borrow;
      const participants = [from, to, guarantor1, guarantor2, guarantor3];

      if (!~participants.indexOf(user.id)) {
        return Promise.reject(new WLError({
          status: 400,
          message: `Current user must be participant of borrow money`
        }));
      }

      if (~[rejected, expired, overdue].indexOf(borrow.state)) {
        return Promise.reject(new WLError({
          status: 400,
          message: `Current borrow money is already ${borrow.state}`
        }));
      }

      let participant = Object.keys({from, to, guarantor1, guarantor2, guarantor3})
        .find(key => borrow[key] === user.id);

      return Promise.resolve({borrow, participant});
    });
}
