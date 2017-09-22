/**
 * EthereumService
 * @description :: Set of functions for work with Ethereum blockchain
 */

/* global sails _ */

const {provider, networkId, koraWallet, koraRecoveryKey, gas, gasPrice} = sails.config.ethereum;
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

  // TODO: Add try catch
  decryptAccount: function ({ keystore, password }) {
    return accounts.decrypt(keystore, password);
  },

  createIdentity: function ({ account }, done) {
    const createIdentity = identityManager.methods.createIdentity(account.address, koraRecoveryKey.address);
    const encodedCreateIdentity = createIdentity.encodeABI();

    let filter = {
      creator: koraWallet.address,
      owner: account.address,
      recoveryKey: koraRecoveryKey.address
    };

    let tx = {
      to: identityManagerAddress,
      data: encodedCreateIdentity,
      gas,
      gasPrice
    };

    sails.log.info('Sign createIdentity transaction:\n', tx);
    accounts.signTransaction(tx, koraWallet.privateKey)
      .then(signedTx => {
        sails.log.info('Send signed createIdentity transaction:\n', signedTx);
        return eth.sendSignedTransaction(signedTx.rawTransaction);
      })
      .then(receipt => {
        sails.log.info('Transaction createIdentity receipt:\n', receipt);

        return identityManager.getPastEvents('IdentityCreated', {
          filter,
          fromBlock: receipt.blockNumber
        });
      })
      .then(events => {
        sails.log.info('IdentityCreated events:\n', events);

        let event = _.find(events, {returnValues: filter});

        if (!event) {
          return Promise.reject(new Error(`Method getPastEvents didn't return desired IdentityCreated event`));
        }

        return done(null, event.returnValues);
      })
      .catch(err => {
        sails.log.error(err);
        return done(err);
      });
  },

  createIdentityTxRelay: function ({ account }, done) {
    const createIdentity = identityManager.methods.createIdentity(account.address, koraRecoveryKey.address);
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
