/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails User EthereumService JWTokenService */

const provider = sails.config.ethereum.provider;
const Accounts = require('web3-eth-accounts');
const accounts = new Accounts(provider);

const password = 'qwer1234';

module.exports = {
  create: function (req, res) {
    let allParams = req.allParams();

    if (allParams.password !== allParams.confirmPassword) {
      return res.json(401, {err: 'Password doesn\'t match, What a shame!'});
    }

    delete allParams.confirmPassword;

    User.create(allParams).exec(function (err, user) {
      if (err) {
        return res.json(err.status, {err: err});
      }

      // If user created successfuly we return user and token as response
      if (user) {
       // NOTE: payload is { id: user.id}
        res.json(200, {user: user, token: JWTokenService.issue({id: user.id})});
      }
    });
  },

  testIdentity: function (req, res) {
    User.findOne({ phone: '102' }).exec((err, user) => {
      if (err) {
        return res.negotiate(err);
      }

      const account = accounts.decrypt(user.keystore, password);

      EthereumService.createIdentity({account}, function (err, result) {
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

    EthereumService.createIdentity({account}, function (err, result) {
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
