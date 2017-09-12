/**
 * EthereumController
 *
 * @description :: Server-side logic for managing ethereums
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails */

var Web3 = require('web3');

var Accounts = require('web3-eth-accounts');
var accounts = new Accounts(sails.config.ethereum.provider);

// eth.setProvider(new eth.providers.HttpProvider('http://localhost:8545'))

module.exports = {

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

    return res.json({ address, keystore });
  }
};
