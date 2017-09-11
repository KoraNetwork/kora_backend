/**
 * EthereumController
 *
 * @description :: Server-side logic for managing ethereums
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Web3 = require('web3');

var Accounts = require('web3-eth-accounts');
var accounts = new Accounts('http://localhost:8545');

// eth.setProvider(new eth.providers.HttpProvider('http://localhost:8545'))

module.exports = {

  /**
   * `EthereumController.create()`
   */
  create: function (req, res) {
    let acc = accounts.create(Web3.utils.randomHex(32));

    sails.log.info('New ethereum account created:', acc);

    return res.json(acc);
  }
};
