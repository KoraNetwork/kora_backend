/**
 * LendService
 * @description :: Set of functions for work with KoraLend smart-contract
 */

/* global sails EthereumService MiscService */

const {provider, networkId, KoraLend, koraWallet, gas, gasPrice} = sails.config.ethereum;

const Accounts = require('web3-eth-accounts');
const accounts = new Accounts(provider);

const Contract = require('web3-eth-contract');
Contract.setProvider(provider);

const fs = require('fs');
const koraLendAbi = JSON.parse(fs.readFileSync('./build/contracts/KoraLend.abi', 'utf8'));
const koraLendAddress = KoraLend.networks[networkId].address;
const koraLend = new Contract(koraLendAbi, koraLendAddress);

module.exports = {
  sendRawCreateLoan: function ({rawCreateLoan}, cb) {
    let promise = EthereumService.sendSignedTransactionWithEvent({
      rawTransaction: rawCreateLoan,
      name: 'KoraLend.createLoan',
      contract: koraLend,
      event: 'LoanCreated'
    })
      .then(({receipt, events}) => ({receipt, event: events[0]}));

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  sendRawAgreeLoan: function ({rawAgreeLoan}, cb) {
    let promise = EthereumService.sendSignedTransactionWithEvent({
      rawTransaction: rawAgreeLoan,
      name: 'KoraLend.agreeLoan',
      contract: koraLend,
      event: 'GuarantorAgreed'
    })
      .then(({receipt, events}) => ({receipt, event: events[0]}));

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  sendRawFundLoan: function ({rawFundLoan}, cb) {
    let promise = EthereumService.sendSignedTransactionWithEvent({
      rawTransaction: rawFundLoan,
      name: 'KoraLend.fundLoan',
      contract: koraLend,
      event: 'LoanFunded'
    })
      .then(({receipt, events}) => ({receipt, event: events[0]}));

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  sendRawPayBackLoan: function ({rawPayBackLoan}, cb) {
    let promise = EthereumService.sendSignedTransactionWithEvent({
      rawTransaction: rawPayBackLoan,
      name: 'KoraLend.payBackLoan',
      contract: koraLend,
      event: 'LoanPaymentDone'
    })
      .then(({receipt, events}) => ({receipt, event: events[0]}));

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  getLoan: function ({loanId}, cb) {
    let promise = koraLend.methods.loans(loanId).call();

    return MiscService.cbify(promise, cb);
  },

  getLoanGuarantors: function ({loanId}, cb) {
    let promise = koraLend.methods.getLoanGuarantors(loanId).call();

    return MiscService.cbify(promise, cb);
  },

  closeLoan,

  closeLoanExpired: function ({loanId, nonce}, cb) {
    return closeLoan({loanId, nonce, event: 'LoanExpired'}, cb);
  },

  closeLoanOverdue: function ({loanId, nonce}, cb) {
    return closeLoan({loanId, nonce, event: 'LoanOverdue'}, cb);
  }
};

function closeLoan ({loanId, nonce, event}, cb) {
  const method = koraLend.methods.closeLoan(loanId);
  const encodedMethod = method.encodeABI();

  let tx = {
    to: koraLendAddress,
    data: encodedMethod,
    gas,
    gasPrice,
    nonce
  };

  sails.log.info('Sign closeLoan transaction:\n', tx);

  let promise = accounts.signTransaction(tx, koraWallet.privateKey)
    .then(signedTx => {
      sails.log.info('Send signed closeLoan transaction:\n', signedTx);

      return EthereumService.sendSignedTransactionWithEvent({
        rawTransaction: signedTx.rawTransaction,
        name: 'KoraLend.closeLoan',
        contract: koraLend,
        event // 'LoanExpired', 'LoanOverdue'
      });
    })
    .then(({receipt, events}) => ({receipt, event: events[0]}));

  return MiscService.cbify(promise, cb);
}
