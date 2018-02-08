/**
 * LendService
 * @description :: Set of functions for work with KoraLend smart-contract
 */

/* global sails EthereumService MiscService */

const {provider, networkId, KoraLend} = sails.config.ethereum;

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
  }
};
