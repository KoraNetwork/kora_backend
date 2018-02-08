/**
 * BorrowService
 * @description :: Sends raw transactions for Borrow
 */

/* global sails Borrow LendService Transactions User TokensService */

const {networkId, KoraLend} = sails.config.ethereum;
const koraLendAddress = KoraLend.networks[networkId].address;

module.exports = {
  sendRawCreateLoan: function ({rawCreateLoan, record}) {
    const {states, types} = Borrow.constants;

    LendService.sendRawCreateLoan({rawCreateLoan})
      .then(({receipt, event}) => {
        const loanId = event.returnValues.loanId;

        record.transactionHashes.push(receipt.transactionHash);
        record.loanId = loanId;

        return Promise.all([
          Borrow.findOnePopulate({id: record.id}),
          LendService.getLoan({loanId}),
          LendService.getLoanGuarantors({loanId})
        ]);
      })
      .then(([populatedRecord, loan, guarantors]) => {
        if (loan.borrower.toLowerCase() !== populatedRecord.from.identity.toLowerCase()) {
          return Promise.reject(new Error(`Borrower address does not match`));
        }

        if (loan.lender.toLowerCase() !== populatedRecord.to.identity.toLowerCase()) {
          return Promise.reject(new Error(`Lender address does not match`));
        }

        let lowerCasedGuarantors = guarantors.map(g => g.toLowerCase());

        if (populatedRecord.guarantor1 && lowerCasedGuarantors.indexOf(populatedRecord.guarantor1.identity.toLowerCase()) === -1) {
          return Promise.reject(new Error(`Guarantor1 address does not match`));
        }

        if (populatedRecord.guarantor2 && lowerCasedGuarantors.indexOf(populatedRecord.guarantor2.identity.toLowerCase()) === -1) {
          return Promise.reject(new Error(`Guarantor2 address does not match`));
        }

        if (populatedRecord.guarantor3 && lowerCasedGuarantors.indexOf(populatedRecord.guarantor3.identity.toLowerCase()) === -1) {
          return Promise.reject(new Error(`Guarantor3 address does not match`));
        }

        if (TokensService.convertValueToToken(loan.borrowerAmount) !== populatedRecord.fromAmount) {
          return Promise.reject(new Error(`Borrower amount does not match`));
        }

        if (TokensService.convertValueToToken(loan.lenderAmount) !== populatedRecord.toAmount) {
          return Promise.reject(new Error(`Lender amount does not match`));
        }

        if (TokensService.convertValueToToken(loan.interestRate) !== populatedRecord.interestRate) {
          return Promise.reject(new Error(`Interest rate does not match`));
        }

        if (loan.startDate * 1 !== Math.floor(Date.parse(populatedRecord.startDate) / 1000)) {
          return Promise.reject(new Error(`Start date does not match`));
        }

        if (loan.maturityDate * 1 !== Math.floor(Date.parse(populatedRecord.maturityDate) / 1000)) {
          return Promise.reject(new Error(`Maturity date does not match`));
        }

        return Promise.resolve();
      })
      .then(() => {
        record.state = states.onGoing;
        ['to', 'guarantor1', 'guarantor2', 'guarantor3'].filter(k => record[k])
          .forEach(k => (record[k + 'Agree'] = null));

        return Borrow.update({id: record.id}, record);
      }, err => {
        record.state = states.agreed;
        record.type = types.request;

        if (err.receipt) {
          record.transactionHashes.push(err.receipt.transactionHash);
        }

        if (err.message) {
          // TODO: Maybe add push with error message here
          sails.log.error(err.message);
        }

        return Borrow.update({id: record.id}, record);
      })
      .then(updated => {
        // TODO: Add push here
        sails.log.info('Borrow money after KoraLend.createLoan tx saved:\n', updated[0]);
      })
      .catch(err => sails.log.error('Borrow money after KoraLend.createLoan tx save error:\n', err));
  },

  sendRawAgreeLoan: function ({rawAgreeLoan, record}) {
    const {states} = Borrow.constants;

    let guarantorIdentity;

    LendService.sendRawAgreeLoan({rawAgreeLoan})
      .then(({receipt, event}) => {
        record.transactionHashes.push(receipt.transactionHash);

        // eslint-disable-next-line eqeqeq
        if (record.loanId != event.returnValues.loanId) {
          let err = new Error('Borrow record and GuarantorAgreed event loanIds not equals');
          sails.log.error(err);
          return Promise.reject(err);
        }

        guarantorIdentity = event.returnValues.guarantor;

        return Borrow.findOnePopulate({id: record.id});
      })
      .then(populatedRecord => {
        let guarantorKey = ['guarantor1', 'guarantor2', 'guarantor3'].filter(k => record[k])
          .find(k => populatedRecord[k].identity.toLowerCase() === guarantorIdentity.toLowerCase());

        if (!guarantorKey) {
          let err = new Error(`Borrow record not has guarantor with identity equal GuarantorAgreed event guarantor`);
          sails.log.error(err);
          return Promise.reject(err);
        }

        record[guarantorKey + 'Agree'] = true;

        if (
          ['guarantor1', 'guarantor2', 'guarantor3'].filter(k => record[k])
            .every(k => record[k + 'Agree'])
        ) {
          record.state = states.agreed;
        } else {
          record.state = states.onGoing;
        }

        return Borrow.update({id: record.id}, record);
      }, err => {
        record.state = states.onGoing;

        if (err.receipt) {
          record.transactionHashes.push(err.receipt.transactionHash);
        }

        return Borrow.update({id: record.id}, record);
      })
      .then(updated => {
        // TODO: Add push here
        sails.log.info('Borrow money after KoraLend.agreeLoan tx saved:\n', updated[0]);
      })
      .catch(err => sails.log.error('Borrow money after KoraLend.agreeLoan tx save error:\n', err));
  },

  sendRawLoanTransfer: function ({rawApprove, rawFundLoan, rawPayBackLoan, record}) {
    const {states, types} = Borrow.constants;

    Promise.all([
      User.findOne({id: record.from}),
      User.findOne({id: record.to})
    ])
      .then(([fromUser, toUser]) =>
        TokensService.sendSignedApprove({
          rawTransaction: rawApprove,
          tokenAddress: rawFundLoan ? toUser.ERC20Token : fromUser.ERC20Token
        })
          .then(({_spender, _value}) => {
            if (rawFundLoan) {
              if (
                !(
                  _spender.toLowerCase() === koraLendAddress.toLowerCase() &&
                  TokensService.convertValueToToken(_value) >= record.toAmount
                )
              ) {
                return Promise.reject(new Error(`Transaction 'rawApprove' not valid`));
              }

              if (fromUser.currency !== toUser.currency) {
                return TokensService.approveFromKora({
                  spender: koraLendAddress,
                  value: record.fromAmount,
                  tokenAddress: fromUser.ERC20Token
                });
              }
            }

            if (rawPayBackLoan) {
              const fromValue = TokensService.convertValueToToken(_value);
              const {fromBalance, toBalance} = record;

              if (!(_spender.toLowerCase() === koraLendAddress.toLowerCase() && fromValue > 0)) {
                return Promise.reject(new Error(`Transaction 'rawApprove' not valid`));
              }

              if (fromUser.currency !== toUser.currency) {
                return TokensService.approveFromKora({
                  spender: koraLendAddress,
                  value: (fromValue >= fromBalance) ? toBalance : fromValue * toBalance / fromBalance,
                  tokenAddress: fromUser.ERC20Token
                });
              }
            }
          })
      )
      .then(() => {
        if (rawFundLoan) {
          return LendService.sendRawFundLoan({rawFundLoan});
        }

        if (rawPayBackLoan) {
          return LendService.sendRawPayBackLoan({rawPayBackLoan});
        }
      })
      .then(
        ({receipt, event}) => {
          record.transactionHashes.push(receipt.transactionHash);
          record.state = states.onGoing;
          record.fromBalance = TokensService.convertValueToToken(event.returnValues.borrowerBalance);
          record.toBalance = TokensService.convertValueToToken(event.returnValues.lenderBalance);

          return {
            state: Transactions.constants.states.success,
            fromValue: TokensService.convertValueToToken(event.returnValues.borrowerValue),
            toValue: TokensService.convertValueToToken(event.returnValues.lenderValue)
          };
        },
        err => {
          if (rawFundLoan) {
            record.state = states.agreed;
            record.type = types.loan;
          } else if (rawPayBackLoan) {
            record.state = states.onGoing;
          }

          if (err.receipt) {
            record.transactionHashes.push(err.receipt.transactionHash);
          }

          return {
            state: Transactions.constants.states.error,
            fromValue: 0,
            toValue: 0,
            message: err.message || 'Something went wrong'
          };
        }
      )
      .then(({state, fromValue, toValue, message}) => {
        let {from, to, fromAmount, toAmount, fromBalance, additionalNote, loanId, transactionHashes} = record;

        let tx = {
          state,
          additionalNote: message || additionalNote,
          loanId,
          transactionHashes: [transactionHashes[transactionHashes.length - 1]]
        };

        if (rawFundLoan) {
          Object.assign(tx, {
            type: Transactions.constants.types.borrowFund,
            from: to,
            to: from,
            fromAmount: toAmount,
            toAmount: fromAmount
          });
        }

        if (rawPayBackLoan) {
          Object.assign(tx, {
            type: Transactions.constants.types.borrowPayBack,
            from,
            to,
            fromAmount: fromValue,
            toAmount: toValue
          });
        }

        return Transactions.create(tx)
          .then(() => {
            if (fromBalance === 0) {
              return Borrow.destroy({id: record.id});
            }

            return Borrow.update({id: record.id}, record);
          });
      })
      .then(records => {
        // TODO: Add push here
        sails.log.info(
          `Borrow money after KoraLend.${rawFundLoan ? 'fundLoan' : 'payBackLoan'} tx ${records[0].fromBalance ? 'saved' : 'destroyed'}:\n`,
          records[0]
        );
      })
      .catch(err => sails.log.error(`Borrow money after KoraLend.${rawFundLoan ? 'fundLoan' : 'payBackLoan'} tx save/destroy error:\n`, err));
  }
};
