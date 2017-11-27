/**
 * BorrowController
 *
 * @description :: Server-side logic for managing borrows
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Borrow ValidationService */

const WLError = require('waterline/lib/waterline/error/WLError');

module.exports = {
  find: function (req, res) {
    const directions = Borrow.constants.directions;
    const userId = req.user.id;
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
      Borrow.findPopulate({where, limit, skip, sort, userId}),
      Borrow.count(where)
    ])
      .then(([data, total]) => ({data, total}))
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  findOne: function (req, res) {
    let allParams = req.allParams();
    const userId = req.user.id;

    Borrow.findOnePopulate({id: allParams.id, userId})
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

    Borrow.create(allParams)
      .then(({id}) => Borrow.findOnePopulate({id, userId}))
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  update: function (req, res) {
    const types = Borrow.constants.types;
    const states = Borrow.constants.states;
    let allParams = req.allParams();
    const userId = req.user.id;

    findOneValidBorrow({id: allParams.id, userId})
      .then(({borrow, participant}) => {
        const {to, guarantor1, guarantor2, guarantor3} = borrow;

        switch (borrow.type) {
          case types.request:
            if (Date.now() > Date.parse(borrow.startDate)) {
              return Promise.reject(new WLError({message: 'Borrow money must be already expired', status: 400}));
            }

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
                } else if (
                  Object.keys({to, guarantor1, guarantor2, guarantor3})
                    .filter(k => borrow[k])
                    .every(k => borrow[k + 'Agree'])
                ) {
                  borrow.state = states.agreed;
                }

                break;

              case states.agreed:
                let {rawCreateLoan} = allParams;

                if (participant !== 'from') {
                  return Promise.reject(new WLError({message: 'Borrow money already agreed', status: 400}));
                }

                if (!(rawCreateLoan && ValidationService.hex(rawCreateLoan))) {
                  return res.badRequest(new WLError({message: `Parameter 'rawCreateLoan' must be set and must be hex`, status: 400}));
                }

                borrow.type = types.loan;
                borrow.rawCreateLoan = rawCreateLoan;

                break;

              default:
                return Promise.reject(new WLError({
                  message: `Borrow money is ${borrow.state} currently`,
                  status: 400
                }));
            }

            break;

          case types.loan:
            if (Date.now() > Date.parse(borrow.startDate)) {
              return Promise.reject(new WLError({message: 'Borrow money must be already expired', status: 400}));
            }

            switch (borrow.state) {
              case states.onGoing:
                let {rawAgreeLoan} = allParams;

                if (participant === 'from') {
                  return Promise.reject(new WLError({message: 'Borrow money not funded', status: 400}));
                }

                if (participant === 'to') {
                  return Promise.reject(new WLError({message: 'Borrow money not agreed', status: 400}));
                }

                if (typeof borrow[participant + 'Agree'] === 'boolean') {
                  return Promise.reject(new WLError({message: 'User already did agreement', status: 400}));
                }

                if (!(rawAgreeLoan && ValidationService.hex(rawAgreeLoan))) {
                  return res.badRequest(new WLError({message: `Parameter 'rawAgreeLoan' must be set and must be hex`, status: 400}));
                }

                borrow.rawAgreeLoan = rawAgreeLoan;

                break;

              case states.agreed:
                let {rawApproves, rawFundLoan} = allParams;

                if (participant !== 'to') {
                  return Promise.reject(new WLError({message: 'Borrow money not funded', status: 400}));
                }

                if (!(rawApproves && rawApproves.length && rawApproves.every(a => ValidationService.hex(a)))) {
                  return res.badRequest(new WLError({message: `Parameter 'rawApproves' must be set and must be hex array`, status: 400}));
                }

                if (!(rawFundLoan && ValidationService.hex(rawFundLoan))) {
                  return res.badRequest(new WLError({message: `Parameter 'rawFundLoan' must be set and must be hex`, status: 400}));
                }

                borrow.type = types.inProgress;
                borrow.rawApproves = rawApproves;
                borrow.rawFundLoan = rawFundLoan;

                break;

              default:
                return Promise.reject(new WLError({
                  message: `Borrow money is ${borrow.state} currently`,
                  status: 400
                }));
            }

            break;

          case types.inProgress:
            if (Date.now() > Date.parse(borrow.startDate)) {
              return Promise.reject(new WLError({message: 'Start date has not arrived', status: 400}));
            }

            if (Date.now() > Date.parse(borrow.maturityDate)) {
              return Promise.reject(new WLError({message: 'Borrow money must be already overdue', status: 400}));
            }

            switch (borrow.state) {
              case states.onGoing:
                let {rawApproves, rawPayBackLoan} = allParams;

                if (participant !== 'from') {
                  return Promise.reject(new WLError({message: 'Borrow money already funded. Current user is not borrower', status: 400}));
                }

                if (!(rawApproves && rawApproves.length && rawApproves.every(a => ValidationService.hex(a)))) {
                  return res.badRequest(new WLError({message: `Parameter 'rawApproves' must be set and must be hex array`, status: 400}));
                }

                if (!(rawPayBackLoan && ValidationService.hex(rawPayBackLoan))) {
                  return res.badRequest(new WLError({message: `Parameter 'rawPayBackLoan' must be set and must be hex`, status: 400}));
                }

                borrow.rawApproves = rawApproves;
                borrow.rawPayBackLoan = rawPayBackLoan;

                break;

              default:
                return Promise.reject(new WLError({
                  message: `Borrow money is ${borrow.state} currently`,
                  status: 400
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
      .then(({id}) => Borrow.findOnePopulate({id, userId}))
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

function findOneValidBorrow ({id, userId}) {
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

      if (!~participants.indexOf(userId)) {
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
        .find(key => borrow[key] === userId);

      return Promise.resolve({borrow, participant});
    });
}
