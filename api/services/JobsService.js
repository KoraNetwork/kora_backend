/**
 * JobsService
 * description:: Jobs for scheduler
 */

/* global sails Borrow */

module.exports = {
  closeLoans: function () {
    sails.log.info(new Date().toISOString(), '-', 'Run close loans job');

    const {states, types} = Borrow.constants;
    const now = new Date();

    Promise.all([
      Borrow.update({
        startDate: {'<=': now},
        type: types.request,
        state: [states.onGoing, states.agreed]
      }, {
        state: states.expired
      }),
      Borrow.find({
        startDate: {'<=': now},
        type: types.loan,
        state: [states.onGoing, states.agreed]
      }),
      Borrow.find({
        maturityDate: {'<': now},
        type: types.inProgress,
        state: states.onGoing
      })
    ])
      .then(([expiredRequests, expiredLoans, overdueLoans]) => {
        sails.log.info(expiredRequests.length, 'expired requests was updated');
        sails.log.info(expiredLoans.length, 'expired loans was find');
        sails.log.info(overdueLoans.length, 'overdue loans was find');
      })
      .catch((err) => sails.log.error(err));
  }
};
