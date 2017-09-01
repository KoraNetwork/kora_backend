/**
 * EthereumController
 *
 * @description :: Server-side logic for managing ethereums
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Web3Eth = require('web3-eth');
var eth = new Web3Eth('http://localhost:8545');

var Web3EthPersonal = require('web3-eth-personal');
var personal = new Web3EthPersonal('http://localhost:8545');

// eth.setProvider(new eth.providers.HttpProvider('http://localhost:8545'));

module.exports = {



  /**
   * `EthereumController.create()`
   */
  // create: function (req, res) {
  //   var acc = eth.accounts.create();

  //   return res.json(acc);
  // },

  create: function(req, res) {
    personal.newAccount('!@superpassword')
      .then((acc) => {
        // console.log(acc);

        return res.ok();
      })
      .catch(err => res.negotiate(err));

    // return res.json(acc);
  }
};
