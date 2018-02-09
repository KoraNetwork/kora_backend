/**
 * TokensService
 * @description :: Set of functions for work with Kora Tokens
 */

/* global sails EthereumService MiscService */

const {provider, networkId, koraWallet, HumanStandardToken, gas, gasPrice, koraTokenExponent} = sails.config.ethereum;
// const Web3 = require('web3');
// const Web3Utils = require('web3-utils');

// const Eth = require('web3-eth');
// const eth = new Eth(provider);

const Accounts = require('web3-eth-accounts');
const accounts = new Accounts(provider);

const Contract = require('web3-eth-contract');
Contract.setProvider(provider);

// const uportIdentity = require('uport-identity');
// const {
//   // TxRelay,
//   // Proxy,
//   IdentityManager
// } = uportIdentity;

// const identityManagerAddress = '0x692a70d2e424a56d2c6c27aa97d1a86395877b3a'; // Local
// const identityManagerAddress = IdentityManager.networks[networkId].address; // Testnet
// const identityManager = new Contract(IdentityManager.abi, identityManagerAddress);

// const txRelayAddress = TxRelay.networks[networkId].address // Testnet
// const txRelay = new Contract(TxRelay.abi, txRelayAddress)

const fs = require('fs');
const humanStandardTokenAbi = JSON.parse(fs.readFileSync('./build/contracts/HumanStandardToken.abi', 'utf8'));
// const humanStandardTokenAddress = HumanStandardToken.networks[networkId].address;
// const humanStandardToken = new Contract(humanStandardTokenAbi, humanStandardTokenAddress);

module.exports = {
  balanceOf: function ({address, tokenAddress}, cb) {
    const humanStandardToken = new Contract(humanStandardTokenAbi, tokenAddress);

    let promise = humanStandardToken.methods.balanceOf(address).call();
    // .then(result => cb(null, parseInt(result, 10) / Math.pow(10, koraTokenExponent)))
    // .catch(err => cb(err));

    return MiscService.cbify(promise, cb);
  },

  /**
   * Transfers Kora Tokens form Kora Wallet to some address
   * @param  {String}   to    Some address
   * @param  {Number}   value Number of Kora Tokens
   * @param  {Function} cb  Result of transfer
   */
  transferFromKora: function ({ to, value, tokenAddress, nonce }, cb) {
    const humanStandardToken = new Contract(humanStandardTokenAbi, tokenAddress);
    const tokensValue = Math.floor(value * Math.pow(10, koraTokenExponent));
    const transfer = humanStandardToken.methods.transfer(to, tokensValue);
    const encodedTransfer = transfer.encodeABI();

    let tx = {
      to: tokenAddress,
      data: encodedTransfer,
      gas,
      gasPrice,
      nonce
    };

    sails.log.info('Sign transferFromKora transaction:\n', tx);

    let promise = accounts.signTransaction(tx, koraWallet.privateKey)
      .then(signedTx => {
        sails.log.info('Send signed transferFromKora transaction:\n', signedTx);

        return EthereumService.sendSignedTransactionWithEvent({
          rawTransaction: signedTx.rawTransaction,
          name: 'Token.transfer (transferFromKora)',
          contract: humanStandardToken,
          event: 'Transfer'
        });
      })
      .then(({receipt, events}) => {
        // sails.log.info('Transaction transferFromKora success:\n', {receipt, events});
        return events[0].returnValues;
      })
      .catch(err => {
        sails.log.error(`Transaction transferFromKora error:\n`, err);
        return Promise.reject(err);
      });

    return MiscService.cbify(promise, cb);
  },

  approveFromKora: function ({ spender, value, tokenAddress, nonce }, cb) {
    const humanStandardToken = new Contract(humanStandardTokenAbi, tokenAddress);
    const tokensValue = Math.floor(value * Math.pow(10, koraTokenExponent));
    const approve = humanStandardToken.methods.approve(spender, tokensValue);
    const encodedApprove = approve.encodeABI();

    let tx = {
      to: tokenAddress,
      data: encodedApprove,
      gas,
      gasPrice,
      nonce
    };

    sails.log.info('Sign approveFromKora transaction:\n', tx);

    let promise = accounts.signTransaction(tx, koraWallet.privateKey)
      .then(signedTx => {
        sails.log.info('Send signed approveFromKora transaction:\n', signedTx);

        return EthereumService.sendSignedTransactionWithEvent({
          rawTransaction: signedTx.rawTransaction,
          name: 'Token.approve (approveFromKora)',
          contract: humanStandardToken,
          event: 'Approval'
        });
      })
      .then(({receipt, events}) => {
        // sails.log.info('Transaction transferFromKora success:\n', {receipt, events});
        return events[0].returnValues;
      })
      .catch(err => {
        sails.log.error(`Transaction transferFromKora error:\n`, err);
        return Promise.reject(err);
      });

    return MiscService.cbify(promise, cb);
  },

  sendSignedTransfer: function ({rawTransaction, tokenAddress}) {
    const humanStandardToken = new Contract(humanStandardTokenAbi, tokenAddress);

    sails.log.info('Send signed transfer transaction');

    return EthereumService.sendSignedTransactionWithEvent({
      rawTransaction,
      name: 'Token.transfer',
      contract: humanStandardToken,
      event: 'Transfer'
    })
      .then(({receipt, events}) => ({receipt, event: events[0].returnValues}));
  },

  sendSignedApprove: function ({rawTransaction, tokenAddress}) {
    const humanStandardToken = new Contract(humanStandardTokenAbi, tokenAddress);

    sails.log.info('Send signed approve transaction');

    return EthereumService.sendSignedTransactionWithEvent({
      rawTransaction,
      name: 'Token.approve',
      contract: humanStandardToken,
      event: 'Approval'
    })
      .then(({receipt, events}) => ({receipt, event: events[0].returnValues}));
  },

  convertValueToToken: value => (value / Math.pow(10, koraTokenExponent)),

  convertTokenToValue: token => Math.floor(token * Math.pow(10, koraTokenExponent))
};
