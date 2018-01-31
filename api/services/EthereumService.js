/**
 * EthereumService
 * @description :: Set of functions for work with Ethereum blockchain
 */

/* global sails MiscService */

const {provider, networkId, koraWallet, koraRecoveryKey, gas, gasPrice} = sails.config.ethereum;
const Web3 = require('web3');

const Eth = require('web3-eth');
const eth = new Eth(provider);

const Accounts = require('web3-eth-accounts');
const accounts = new Accounts(provider);

const uportIdentity = require('uport-identity');
const {MetaIdentityManager, TxRelay} = uportIdentity;
const Contract = require('web3-eth-contract');
Contract.setProvider(provider);

// const metaIdentityManagerAddress = '0x692a70d2e424a56d2c6c27aa97d1a86395877b3a' // Local
const metaIdentityManagerAddress = MetaIdentityManager.networks[networkId].address; // Testnet
const metaIdentityManager = new Contract(MetaIdentityManager.abi, metaIdentityManagerAddress);

const txRelayAddress = TxRelay.networks[networkId].address; // Testnet
const txRelay = new Contract(TxRelay.abi, txRelayAddress);

module.exports = {
  getBalance: function ({address}, cb) {
    let promise = eth.getBalance(address);

    return MiscService.cbify(promise, cb);
  },

  sendSignedTransaction: function ({rawTransaction, name = 'rawTransaction'}, cb) {
    sails.log.info(`Send signed ${name} raw transaction:\n`, rawTransaction);

    let promise = eth.sendSignedTransaction(rawTransaction)
      // .on('confirmation', function (confirmationNumber, receipt) {
      //   sails.log.info('rawCreateLoan confirmationNumber, receipt:\n', confirmationNumber, receipt);
      // })
      .then(receipt => {
        sails.log.info(`Transaction ${name} receipt:\n`, receipt);

        if (!Web3.utils.hexToNumber(receipt.status)) {
          let err = new Error(`Transaction ${name} status fail`);
          err.receipt = receipt;

          return Promise.reject(err);
        }

        return receipt;
      })
      .catch(err => {
        sails.log.error(`Transaction ${name} send error:\n`, err);
        return Promise.reject(err);
      });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  sendSignedTransactionWithEvent: function ({rawTransaction, name, contract, event}, cb) {
    let cacheReceipt;

    let promise = this.sendSignedTransaction({rawTransaction, name})
      .then(receipt => {
        cacheReceipt = receipt;

        return contract.getPastEvents(event, {
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber
        });
      })
      .then(events => {
        sails.log.info(`${event} events:\n`, events);

        if (!(events && events.length)) {
          return Promise.reject(new Error(`Can't get any ${event} events for ${name} method`));
        }

        return {
          receipt: cacheReceipt,
          events
        };
      })
      .catch(err => {
        sails.log.error(`Transaction ${name} event error:\n`, err);
        return Promise.reject(err);
      });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

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

  createIdentity: function ({ owner, recoveryKey = koraRecoveryKey.address }, cb) {
    const createIdentity = metaIdentityManager.methods.createIdentity(owner, recoveryKey);
    const encodedCreateIdentity = createIdentity.encodeABI();

    let tx = {
      to: metaIdentityManagerAddress,
      data: encodedCreateIdentity,
      gas,
      gasPrice
    };

    sails.log.info('Sign createIdentity transaction:\n', tx);
    let promise = accounts.signTransaction(tx, koraWallet.privateKey)
      .then(signedTx => {
        sails.log.info('Send signed createIdentity transaction:\n', signedTx);
        return this.sendSignedTransactionWithEvent({
          rawTransaction: signedTx.rawTransaction,
          name: 'MetaIdentityManager.createIdentity',
          contract: metaIdentityManager,
          event: 'IdentityCreated'
        });
      })
      .then(({receipt, events}) => {
        // sails.log.info('Transaction createIdentity success:\n', {receipt, events});
        return events[0].returnValues;
      })
      .catch(err => {
        sails.log.error(`Transaction createIdentity error:\n`, err);
        return Promise.reject(err);
      });

    return MiscService.cbify(promise, cb);
  },

  createIdentityTxRelay: function ({ account }, cb) {
    const createIdentity = metaIdentityManager.methods.createIdentity(account.address, koraRecoveryKey.address);
    const encodedCreateIdentity = createIdentity.encodeABI();

    metaIdentityManager.once('IdentityCreated', (err, event) => {
      if (err) {
        sails.log.error(err);
        return cb(err);
      }

      sails.log.info('IdentityCreated once event:\n', event);
      return cb(null, event);
    });

    createIdentity.estimateGas()
      .then(estimatedGas => {
        let tx = {
          to: metaIdentityManagerAddress,
          data: encodedCreateIdentity,
          gas: estimatedGas
        };

        sails.log.info('Sign createIdentity transaction:\n', tx);
        return accounts.signTransaction(tx, account.privateKey);
      })
      .then(signedTx => {
        const {v, r, s, rawTransaction} = signedTx;
        const relayMetaTx = txRelay.methods.relayMetaTx(v, r, s, metaIdentityManagerAddress, rawTransaction);
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
  },

  sendEthFromKora: function ({to, eth = '0.1'}, cb) {
    const name = 'sendEthFromKora';
    let tx = {
      to,
      value: Web3.utils.toWei(eth, 'ether'),
      gas,
      gasPrice
    };

    sails.log.info(`Sign ${name} transaction:\n`, tx);

    let promise = accounts.signTransaction(tx, koraWallet.privateKey)
      .then(signedTx => {
        sails.log.info(`Send signed ${name} transaction:\n`, signedTx);

        return this.sendSignedTransaction({
          rawTransaction: signedTx.rawTransaction,
          name
        });
      })
      .catch(err => {
        sails.log.error(`Transaction createIdentity error:\n`, err);
        return Promise.reject(err);
      });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  }
};
