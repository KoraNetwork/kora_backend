/**
 * LendService
 * @description :: Set of functions for work with KoraLend smart-contract
 */

/* global sails EthereumService */

const {provider, networkId, KoraLend} = sails.config.ethereum;

const Contract = require('web3-eth-contract');
Contract.setProvider(provider);

const fs = require('fs');
const koraLendAbi = JSON.parse(fs.readFileSync('./build/contracts/KoraLend.abi', 'utf8'));
const koraLendAddress = KoraLend.networks[networkId].address;
const koraLend = new Contract(koraLendAbi, koraLendAddress);

module.exports = {
  sendRawCreateLoan: function ({rawCreateLoan}, cb) {
    sails.log.info('Send signed rawCreateLoan transaction:\n', rawCreateLoan);

    let cacheReceipt;

    let promise = EthereumService.sendSignedTransaction({
      rawTransaction: rawCreateLoan,
      name: 'rawCreateLoan'
    })
      .then(receipt => {
        cacheReceipt = receipt;

        return koraLend.getPastEvents('LoanCreated', {
          fromBlock: receipt.blockNumber
        });
      })
      .then(events => {
        sails.log.info('LoanCreated events:\n', events);

        if (!events.length) {
          return Promise.reject(new Error(`Method getPastEvents didn't return any events`));
        }

        return {
          receipt: cacheReceipt,
          event: events[0]
        };
      });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  }
};
