/**
 * LendService
 * @description :: Set of functions for work with KoraLend smart-contract
 */

/* global sails */

const {provider} = sails.config.ethereum;

const Web3 = require('web3');
const web3 = new Web3(provider);
const eth = web3.eth;

module.exports = {
  sendRawCreateLoan: function ({rawCreateLoan}, cb) {
    sails.log.info('Send signed rawCreateLoan transaction:\n', rawCreateLoan);

    let promise = eth.sendSignedTransaction(rawCreateLoan)
      .then(receipt => {
        sails.log.info('Transaction rawCreateLoan receipt:\n', receipt);

        if (!web3.utils.hexToNumber(receipt.status)) {
          let err = new Error('Transaction rawCreateLoan status fail');
          err.receipt = receipt;

          return Promise.reject(err);
        }

        return receipt;
      });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  }
};
