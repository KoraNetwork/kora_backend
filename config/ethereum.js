/**
 * Ethereum configuration
 * @type {Object}
 */

 // const net = require('net');
 // const Web3 = require('web3');
 // const web3 = new Web3('/home/roma/.rinkeby/geth.ipc', net);

module.exports.ethereum = {

  /**
   * Ethereum provider
   * @type {String}
   */
  // Local testnet
  provider: 'http://localhost:8545'
  // provider: web3.currentProvider
  // provider: 'ws://localhost:8546'

  // Main Ethereum Network
  // provider: 'https://mainnet.infura.io/hgr5j4WqYnr4EAbXKZXt'

  // Test Ethereum Network (Ropsten)
  // provider: 'https://ropsten.infura.io/hgr5j4WqYnr4EAbXKZXt'

  // Test Ethereum Network (Rinkeby)
  // provider: 'https://rinkeby.infura.io/hgr5j4WqYnr4EAbXKZXt'

  // Test Ethereum Network (Kovan)
  // provider: 'https://kovan.infura.io/hgr5j4WqYnr4EAbXKZXt'

  // Test Ethereum Network (INFURAnet)
  // provider: 'https://infuranet.infura.io/hgr5j4WqYnr4EAbXKZXt'

  // IPFS Gateway
  // provider: 'https://ipfs.infura.io'

  // IPFS RPC
  // provider: 'https://ipfs.infura.io:5001'

};
