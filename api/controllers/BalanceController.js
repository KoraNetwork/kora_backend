/**
 * BalanceController
 *
 * @description :: Server-side logic for managing balances
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Web3 = require('web3');
var web3 = new Web3();

// web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

var Web3Eth = require('web3-eth');
var eth = new Web3Eth('http://localhost:8545');

module.exports = {
  /**
   * `BalanceController.show()`
   */
  show: function (req, res) {
    // var result = {};
    // var totalBal = 0;
    //
    // for (var acctNum in eth.accounts) {
    //   var acct = eth.accounts[acctNum];
    //   var acctBal = web3.fromWei(eth.getBalance(acct), "ether");
    //
    //   result[acctNum] = {
    //     account: acct,
    //     balance: acctBal,
    //   };
    //
    //   totalBal += parseFloat(acctBal);
    //   console.log("  eth.accounts[" + acctNum + "]: \t" + acct + " \tbalance: " + acctBal + " ether");
    // }
    //
    // result.totalBalance = totalBal;
    // console.log("  Total balance: " + totalBal + " ether");

    // var balance = web3.eth.getBalance("0x407d73d8a49eeb85d32cf465507dd71d507100c1");
    // console.log(balance); // instanceof BigNumber
    // console.log(balance.toString(10)); // '1000000000000'
    // console.log(balance.toNumber()); // 1000000000000

    eth.getCoinbase()
      .then(eth.getBalance)
      // .then(web3.utils.fromWei)
      .then(balance => res.json({ balance }))
      .catch(err => res.negotiate(err));

    // var coinbase = eth.getCoinbase;
    // console.log(coinbase);
    //
    // var balance = eth.getBalance(coinbase);
    // console.log(balance.toString(10));
    //
    // var acctBal = web3.utils.fromWei(balance, "ether");
    //
    // return res.json({
    //   coinbase,
    //   balance: acctBal,
    // });
  }
};
