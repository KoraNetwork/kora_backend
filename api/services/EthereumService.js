/**
 * EthereumService
 * @description :: Set of functions for work with Ethereum blockchain
 */

/* global sails */

const provider = sails.config.ethereum.provider;
const Web3 = require('web3');

const Eth = require('web3-eth');
const eth = new Eth(provider);

const Accounts = require('web3-eth-accounts');
const accounts = new Accounts(provider);

const uportIdentity = require('uport-identity');
const Contract = require('web3-eth-contract');
Contract.setProvider(provider);
const identityManagerAddress = '0x692a70d2e424a56d2c6c27aa97d1a86395877b3a';
const identityManager = new Contract(uportIdentity.IdentityManager.abi, identityManagerAddress);

const recoveryAddress = '0x00a329c0648769A73afAc7F9381E08FB43dBEA72'; // Local node admin

module.exports = {
  /**
   * Generates an account object with private key and public key
   * @param  {[type]}   password Password for a private key encryption to the web3 keystore v3 standard
   * @param  {Function} done     Callback with result
   */
  createAccount: function ({ password }, done) {
    const acc = accounts.create(Web3.utils.randomHex(32));
    const { address, privateKey } = acc;
    const keystore = accounts.encrypt(privateKey, password);

    sails.log.info('Created new ethereum account with address', address);

    return done(null, {address, keystore});
  },

  createIdentity: function ({ account }, done) {
    const createIdentity = identityManager.methods.createIdentity(account.address, recoveryAddress);
    const encodedCreateIdentity = createIdentity.encodeABI();

    createIdentity.estimateGas()
    .then(estimatedGas => accounts.signTransaction({
      to: identityManagerAddress,
      data: encodedCreateIdentity,
      gas: estimatedGas
    }, account.privateKey))
    .then(({ rawTransaction }) => eth.sendSignedTransaction(rawTransaction))
    .then(receipt => done(null, receipt))
    .catch(done);

      // .send({from: '0x471FFf4A05Bbd9C5cab781464d6a4e0f1582779A'})
      // .on('transactionHash', function (hash) {
      //   sails.log.info('transactionHash', hash);
      // })
      // .on('confirmation', function (confirmationNumber, receipt) {
      //   sails.log.info('confirmation', confirmationNumber, receipt);
      // })
      // .on('receipt', function (receipt) {
      //   sails.log.info('receipt', receipt);
      //
      //   return done(null, receipt);
      // })
      // .on('error', function (err) {
      //   return done(err);
      // })
      // // .then(function (receipt) {
      // //   sails.log.info('receipt', receipt)
      // //
      // //   return done(null, receipt)
      // // })
      // .catch(done);

  // return done(null, identityManager.options)
  // return done(null, uportIdentity.IdentityManager.abi)
  }
};
