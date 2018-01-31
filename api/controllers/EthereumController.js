/**
 * EthereumController
 *
 * @description :: Server-side logic for ethereum testing
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails */

const provider = sails.config.ethereum.provider;
var Web3 = require('web3');

const Eth = require('web3-eth');
const eth = new Eth(provider);

var Accounts = require('web3-eth-accounts');
var accounts = new Accounts(provider);

// eth.setProvider(new eth.providers.HttpProvider('http://localhost:8545'))

const ethers = require('ethers');
const { Wallet, utils } = ethers;

module.exports = {

  /**
   * 'EthereumController.getBalance()'
   */
  getBalance: function (req, res) {
    eth.getBalance('0x471FFf4A05Bbd9C5cab781464d6a4e0f1582779A')
      .then(balance => res.send(balance))
      .catch(err => res.negotiate(err));
  },

  /**
   * `EthereumController.create()`
   */
  create: function (req, res) {
    let acc = accounts.create(Web3.utils.randomHex(32));
    let { address, privateKey } = acc;
    let keystore = accounts.encrypt(privateKey, 'qwer1234');

    sails.log.info('New ethereum account created: ', address);

    try {
      var decAcc = accounts.decrypt(keystore, 'qwer1234');
    } catch (e) {
      res.status(401);
      return res.send('Wrong password');
    }

    sails.log.info('Private key test: ', privateKey === decAcc.privateKey);

    return res.json({ acc, keystore });
    // return res.json({ address, keystore });
  },

  /**
   * `EthereumController.createWallet()`
   */
  createWallet: function (req, res) {
    const wallet = Wallet.createRandom(utils.randomBytes(32)); // extraEntropy
    const encryptPromise = wallet.encrypt('qwer1234');

    // sails.log.info('New ethereum account created:\n', wallet);
    console.log('New ethereum wallet created:\n', wallet);

    encryptPromise.then(json => {
      const keystore = JSON.parse(json);
      console.log('New ethereum wallet encrypted:\n', keystore);

      Wallet.fromEncryptedWallet(json, 'qwer1234')
        .then(decWallet => {
          console.log('New ethereum wallet decrypted:\n', decWallet);

          return res.json({wallet, keystore, decWallet});
        })
        .catch(res.negotiate);
    });
  },

  /**
   * `EthereumController.createWallet()`
   */
  createBrainWallet: function (req, res) {
    Wallet.fromBrainWallet('+380123456789', 'qwer1234').then(wallet => {
      console.log('New ethereum brain wallet created:\n', wallet);

      return res.json(wallet);
    })
      .catch(res.negotiate);
  }
};
