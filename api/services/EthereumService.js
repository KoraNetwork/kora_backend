/**
 * EthereumService
 * @description :: Set of functions for work with Ethereum blockchain
 */

/* global sails */

var Web3 = require('web3');

var Accounts = require('web3-eth-accounts');
var accounts = new Accounts(sails.config.ethereum.provider);

module.exports = {
  /**
   * Generates an account object with private key and public key
   * @param  {[type]}   password Password for a private key encryption to the web3 keystore v3 standard
   * @param  {Function} done     Callback with result
   */
  createAccount: function ({ password }, done) {
    let acc = accounts.create(Web3.utils.randomHex(32));
    let { address, privateKey } = acc;
    let keystore = accounts.encrypt(privateKey, password);

    sails.log.info('Created new ethereum account with address ', address);

    return done(null, { address, keystore });
  }
};
