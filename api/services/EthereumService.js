/**
 * EthereumService
 * @description :: Set of functions for work with Ethereum blockchain
 */

/* global sails */

const {provider, networkId} = sails.config.ethereum;
const Web3 = require('web3');

const Eth = require('web3-eth');
const eth = new Eth(provider);

const Accounts = require('web3-eth-accounts');
const accounts = new Accounts(provider);

const uportIdentity = require('uport-identity');
const {IdentityManager, TxRelay} = uportIdentity;
const Contract = require('web3-eth-contract');
Contract.setProvider(provider);

// const identityManagerAddress = '0x692a70d2e424a56d2c6c27aa97d1a86395877b3a' // Local
const identityManagerAddress = IdentityManager.networks[networkId].address; // Testnet
const identityManager = new Contract(IdentityManager.abi, identityManagerAddress);

const txRelayAddress = TxRelay.networks[networkId].address; // Testnet
const txRelay = new Contract(TxRelay.abi, txRelayAddress);

const recoveryAddress = '0x38a84BF14Ce5B37aF9c328C5e74Ff9797dF1204F'; // Kora 103
// const recoveryAddress = '0x00a329c0648769A73afAc7F9381E08FB43dBEA72' // Local node admin

// identityManager.events.IdentityCreated(function (err, event) {
//   if (err) {
//     return sails.log.error(err);
//   }
//
//   sails.log.info('Event IdentityCreated:\n', event);
// })
//   .on('data', function (event) {
//     sails.log.info('Event IdentityCreated data:\n', event); // same results as the optional callback above
//   })
//   .on('changed', function (event) {
//     // remove event from local database
//     sails.log.info('Event IdentityCreated changed:\n', event);
//   })
//   .on('error', err => sails.log.error('Event IdentityCreated error:\n', err));

module.exports = {
  /**
   * Generates an account object with private key and public key
   * @param  {[type]} password Password for a private key encryption to the web3 keystore v3 standard
   * @return {[type]}          Account and keystore
   */
  createAccount: function ({ password }) {
    const account = accounts.create(Web3.utils.randomHex(32));
    const { address, privateKey } = account;
    const keystore = accounts.encrypt(privateKey, password);

    sails.log.info('Created new ethereum account with address', address);

    return {account, keystore};
  },

  createIdentity: function ({ account }, done) {
    const createIdentity = identityManager.methods.createIdentity(account.address, recoveryAddress);
    const encodedCreateIdentity = createIdentity.encodeABI();

    identityManager.once('IdentityCreated', (err, event) => {
      if (err) {
        sails.log.error(err);
        return done(err);
      }

      sails.log.info('IdentityCreated once event:\n', event);
      return done(null, event);
    });

    createIdentity.estimateGas()
      .then(estimatedGas => {
        let tx = {
          to: identityManagerAddress,
          data: encodedCreateIdentity,
          gas: estimatedGas
        };

        sails.log.info('Sign createIdentity transaction:\n', tx);
        return accounts.signTransaction(tx, account.privateKey);
      })
      .then(signedTx => {
        sails.log.info('Send signed createIdentity transaction:\n', signedTx);
        return eth.sendSignedTransaction(signedTx.rawTransaction);
      })
      .then(receipt => sails.log.info('Transaction createIdentity receipt:\n', receipt))
      .catch(err => sails.log.error(err));
  },

  createIdentityTxRelay: function ({ account }, done) {
    const createIdentity = identityManager.methods.createIdentity(account.address, recoveryAddress);
    const encodedCreateIdentity = createIdentity.encodeABI();

    identityManager.once('IdentityCreated', (err, event) => {
      if (err) {
        sails.log.error(err);
        return done(err);
      }

      sails.log.info('IdentityCreated once event:\n', event);
      return done(null, event);
    });

    createIdentity.estimateGas()
      .then(estimatedGas => {
        let tx = {
          to: identityManagerAddress,
          data: encodedCreateIdentity,
          gas: estimatedGas
        };

        sails.log.info('Sign createIdentity transaction:\n', tx);
        return accounts.signTransaction(tx, account.privateKey);
      })
      .then(signedTx => {
        const {v, r, s, rawTransaction} = signedTx;
        const relayMetaTx = txRelay.methods.relayMetaTx(v, r, s, identityManagerAddress, rawTransaction);
        const encodedRelayMetaTX = relayMetaTx.encodeABI();

        return new Promise((resolve, reject) => {
          relayMetaTx.estimateGas()
            .then(estimatedGas => {
              let tx = {
                to: txRelayAddress,
                data: encodedRelayMetaTX,
                gas: estimatedGas
              };

              sails.log.info('Sign relayMetaTx transaction:\n', tx);
              resolve(accounts.signTransaction(tx, account.privateKey));
            })
            .catch(reject);
        });
      })
      .then(signedTx => {
        sails.log.info('Send signed relayMetaTx transaction:\n', signedTx);
        return eth.sendSignedTransaction(signedTx.rawTransaction);
      })
      .then(receipt => sails.log.info('Transaction relayMetaTx receipt:\n', receipt))
      .catch(err => sails.log.error(err));
  }
};
