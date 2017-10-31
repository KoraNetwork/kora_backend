/**
 * TokensService
 * @description :: Set of functions for work with Kora Tokens
 */

/* global sails _ */

const {provider, networkId, koraWallet, HumanStandardToken, gas, gasPrice, koraTokenExponent} = sails.config.ethereum;
// const Web3 = require('web3');
const Web3Utils = require('web3-utils');

const Eth = require('web3-eth');
const eth = new Eth(provider);

const Accounts = require('web3-eth-accounts');
const accounts = new Accounts(provider);

const Contract = require('web3-eth-contract');
Contract.setProvider(provider);

const uportIdentity = require('uport-identity');
const {
  // TxRelay,
  // Proxy,
  IdentityManager
} = uportIdentity;

// const identityManagerAddress = '0x692a70d2e424a56d2c6c27aa97d1a86395877b3a'; // Local
const identityManagerAddress = IdentityManager.networks[networkId].address; // Testnet
const identityManager = new Contract(IdentityManager.abi, identityManagerAddress);

// const txRelayAddress = TxRelay.networks[networkId].address // Testnet
// const txRelay = new Contract(TxRelay.abi, txRelayAddress)

const fs = require('fs');
const humanStandardTokenAbi = JSON.parse(fs.readFileSync('./build/contracts/HumanStandardToken.abi', 'utf8'));
const humanStandardTokenAddress = HumanStandardToken.networks[networkId].address;
const humanStandardToken = new Contract(humanStandardTokenAbi, humanStandardTokenAddress);

module.exports = {
  balanceOf: function ({address}, cb) {
    humanStandardToken.methods.balanceOf(address).call()
      .then(result => cb(null, parseInt(result, 10) / Math.pow(10, koraTokenExponent)))
      .catch(err => cb(err));
  },

  /**
   * Transfers Kora Tokens using signed raw transaction hex
   * @param  {Hex}      rawTransaction  Raw transaction hex
   * @param  {Function} cb              Result of transfer
   */
  transferSignedRawTx: function ({rawTransaction}, cb) {
    sails.log.info('Send signed transferSignedRawTx transaction:\n', rawTransaction);
    let promise = eth.sendSignedTransaction(rawTransaction)
      .on('error', err => sails.log.error('Transaction transferSignedRawTx error:\n', err))
      .then(receipt => {
        sails.log.info('Transaction transferSignedRawTx receipt:\n', receipt);

        if (!Web3Utils.hexToNumber(receipt.status)) {
          let err = new Error('Transaction status fail');
          err.receipt = receipt;

          return Promise.reject(err);
        }

        return receipt;
      });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  /**
   * Transfers Kora Tokens form Kora Wallet to some address
   * @param  {String}   to    Some address
   * @param  {Number}   value Number of Kora Tokens
   * @param  {Function} cb  Result of transfer
   */
  transferFromKora: function ({ to, value }, cb) {
    const tokensValue = value * Math.pow(10, koraTokenExponent);
    const transfer = humanStandardToken.methods.transfer(to, tokensValue);
    const encodedTransfer = transfer.encodeABI();

    let filter = {
      _from: koraWallet.address,
      _to: to,
      _value: tokensValue.toString()
    };

    let tx = {
      to: humanStandardTokenAddress,
      data: encodedTransfer,
      gas,
      gasPrice
    };

    sails.log.info('Sign transferFromKora transaction:\n', tx);
    accounts.signTransaction(tx, koraWallet.privateKey)
      .then(signedTx => {
        sails.log.info('Send signed transferFromKora transaction:\n', signedTx);
        return eth.sendSignedTransaction(signedTx.rawTransaction);
      })
      .then(receipt => {
        sails.log.info('Transaction transferFromKora receipt:\n', receipt);

        return humanStandardToken.getPastEvents('Transfer', {
          filter,
          fromBlock: receipt.blockNumber
        });
      })
      .then(events => {
        sails.log.info('Transfer events:\n', events);

        let event = _.find(events, {returnValues: filter});

        if (!event) {
          return Promise.reject(new Error(`Method getPastEvents didn't return desired Transfer event`));
        }

        return cb(null, event.returnValues);
      })
      .catch(err => {
        sails.log.error(err);
        return cb(err);
      });
  },

  transfer: function ({account, identity, to, value}, cb) {
    const tokensValue = value * Math.pow(10, koraTokenExponent);
    const transfer = humanStandardToken.methods.transfer(to, tokensValue);
    const encodedTransfer = transfer.encodeABI();

    const forwardTo = identityManager.methods.forwardTo(identity, humanStandardTokenAddress, 0, encodedTransfer);
    const encodedForwardTo = forwardTo.encodeABI();

    // let filter = {
    //   _from: account.address,
    //   _to: to,
    //   _value: tokensValue.toString()
    // }

    let tx = {
      to: identityManagerAddress,
      data: encodedForwardTo,
      gas,
      gasPrice
    };

    sails.log.info('Sign forwardTo transaction:\n', tx);
    accounts.signTransaction(tx, account.privateKey)
      .then(signedTx => {
        sails.log.info('Send signed forwardTo transaction:\n', signedTx);
        return eth.sendSignedTransaction(signedTx.rawTransaction);
      })
      .then(receipt => {
        sails.log.info('Transaction forwardTo receipt:\n', receipt);

      //   const proxy = new Contract(Proxy.abi, identity);
      //
      //   return proxy.getPastEvents('Forwarded', {
      //     filter: { destination: humanStandardTokenAddress }
      //   });
      // })
      // .then(events => {
      //   sails.log.info('Forwarded events:\n', events);
      //
      //   return humanStandardToken.getPastEvents('Transfer', {
      //     filter
      //     // fromBlock: receipt.blockNumber
      //   });
      // })
      // .then(events => {
      //   sails.log.info('Transfer events:\n', events);
      //
      //   // let event = _.find(events, {returnValues: filter});
      //   //
      //   // if (!event) {
      //   //   return Promise.reject(new Error(`Method getPastEvents didn't return desired Transfer event`));
      //   // }
      //   //
      //   // return cb(null, event.returnValues);
      //   // return cb(null, events);

        return cb(null, receipt);
      })
      .catch(err => {
        sails.log.error(err);
        return cb(err);
      });
  }
};
