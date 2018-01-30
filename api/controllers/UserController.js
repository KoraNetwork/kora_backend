/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails User EthereumService */

const provider = sails.config.ethereum.provider;
const Accounts = require('web3-eth-accounts');
const accounts = new Accounts(provider);

const password = 'qwer1234';

module.exports = {
  testIdentity: function (req, res) {
    User.findOne({ phone: '102' }).exec((err, user) => {
      if (err) {
        return res.negotiate(err);
      }

      const account = accounts.decrypt(user.keystore, password);

      EthereumService.createIdentity({owner: account.address}, function (err, result) {
        if (err) {
          return res.negotiate(err);
        }

        sails.log.info('Test createIdentity result:\n', result);

        return res.json(result);
      });
    });
  },

  /**
   * Creates identity
   */
  createIdentity: function (req, res) {
    const {account} = EthereumService.createAccount({password});

    EthereumService.createIdentity({owner: account.address}, function (err, result) {
      if (err) {
        return res.negotiate(err);
      }

      return res.json({account, result});
    });
  },

  createIdentityTxRelay: function (req, res) {
    const {account} = EthereumService.createAccount({password});

    EthereumService.createIdentityTxRelay({account}, function (err, result) {
      if (err) {
        return res.negotiate(err);
      }

      sails.log.info('Test createIdentityTxRelay result:\n', result);

      return res.json(result);
    });
  }
};
