/**
 * Development environment settings
 *
 * This file can include shared settings for a development team,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */

const {infuraToken} = require('../local');

// const net = require('net');
const Web3 = require('web3');
// const web3 = new Web3('/home/roma/.rinkeby/geth.ipc', net);
const web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/' + infuraToken));

module.exports = {

  /***************************************************************************
   * Set the default database connection for models in the development       *
   * environment (see config/connections.js and config/models.js )           *
   ***************************************************************************/

  models: {
    connection: 'localMongodbServer'
  },

  ethereum: {
    provider: web3.currentProvider
  }

};
