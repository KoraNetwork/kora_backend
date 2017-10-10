/**
 * Production environment settings
 *
 * This file can include shared settings for a production environment,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */

const net = require('net');
const Web3 = require('web3');
const web3 = new Web3('/home/ubuntu/.rinkeby/geth.ipc', net);

module.exports = {

  /***************************************************************************
   * Azure environment variables                 *
   ***************************************************************************/

  // Use process.env.port to handle web requests to the default HTTP port
  port: process.env.port,
  // Increase hooks timout to 30 seconds
  // This avoids the Sails.js error documented at https://github.com/balderdashy/sails/issues/2691
  hookTimeout: 30000,

  /***************************************************************************
   * Set the default database connection for models in the production        *
   * environment (see config/connections.js and config/models.js )           *
   ***************************************************************************/

  models: {
    connection: 'localMongodbServer'
  },

  /***************************************************************************
   * Set the port in the production environment to 80                        *
   ***************************************************************************/

  // port: 80,

  /***************************************************************************
   * Set the log level in production environment to "silent"                 *
   ***************************************************************************/

  // log: {
  //   level: "silent"
  // },

  /***************************************************************************
  * Include errors in response in the production environment                 *
  ***************************************************************************/
  keepResponseErrors: true,

  /**
   * Blueprint API configuration
   */
  blueprints: {
    /**
     * Shortcut routes disable
     */
    shortcuts: false
  },

  /***************************************************************************
   * Enable morgan logger sails-hook-requestlogger                           *
   ***************************************************************************/

  requestlogger: {
    inProduction: true
  },

  ethereum: {
    provider: web3.currentProvider
  }

};
