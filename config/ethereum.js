/**
 * Ethereum configuration
 * @type {Object}
 */

const {infuraToken} = require('./local');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/' + infuraToken));
// const net = require('net');
// const web3 = new Web3('/home/user/.rinkeby/geth.ipc', net);

module.exports.ethereum = {

  /**
   * Ethereum provider
   * @type {String}
   */
  provider: web3.currentProvider,

  /**
   * Network id
   */
  networkId: 4, // Rinkeby testnet
  // networkId: 42, // Kovan testnet

  gas: 4300000,
  gasPrice: 2000000000,

  /**
   * humanStandardToken
   */
  HumanStandardToken: {
    networks: {
      4: {
        address: '0xE57768e12C50C7D4134bB7a1Ca2917689719183C'
      }
    }
  },

  koraTokenExponent: 2,

  koraTokenSymbol: 'KTN',

  /**
   * KoraLend
   */
  KoraLend: {
    networks: {
      4: {
        address: '0x52a6ea5a93a58f51f1761145b1a93538f64df292'
      }
    }
  },

  newUserMoney: {
    ETH: 0.05,
    eUSD: 1500
  }
};
