/**
 * JobsService
 * description:: Jobs for scheduler
 */

/* global sails Borrow EthereumService LendService */

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

        return EthereumService.getKoraWalletTransactionCount()
          .then(nonce => {
            let expiredLoansPromises = mapLoansForClose({records: expiredLoans, state: states.expired, event: 'LoanExpired', nonce: () => nonce++ + ''});
            let overdueLoansPromises = mapLoansForClose({records: overdueLoans, state: states.overdue, event: 'LoanOverdue', nonce: () => nonce++ + ''});

            return Promise.all(expiredLoansPromises.concat(overdueLoansPromises));
          })
          .then(records => {
            sails.log.info('All records', records);
            sails.log.info(records.filter(r => r).length, 'expired/overdue loans was updated');
          });
      })
      .catch((err) => sails.log.error(err));
  }
};

function mapLoansForClose ({records, state, event, nonce}) {
  const update = record => Borrow.update({id: record.id}, record)
    .then(([record]) => record)
    .catch(err => {
      sails.log.error(err);
    });

  return records.map(record => {
    // If some db data inconsistence
    if (!record.loanId) {
      record.state = state;
      return update(record);
    }

    return LendService.closeLoan({loanId: record.loanId, nonce: nonce(), event})
      .then(
        ({receipt, event}) => {
          record.transactionHashes.push(receipt.transactionHash);
          record.state = state;

          return update(record);
        },
        err => {
          if (err.receipt) {
            record.transactionHashes.push(err.receipt.transactionHash);
          }

          return update(record);
        }
      );
  });
}
