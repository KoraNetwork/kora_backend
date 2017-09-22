/**
 * TokensController
 *
 * @description :: Server-side logic for managing tokens
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails TokensService User EthereumService */

// const {validation} = sails.config.validation;

module.exports = {

  /**
   * `TokensController.balanceOf()`
   */
  balanceOf: function (req, res) {
    const phone = req.param('phone');

    if (!phone) {
      return res.send({
        balance: null,
        message: 'Phone was not set'
      });
    }

    User.findOne({phone}).exec((err, {identity}) => {
      if (err) {
        return res.negotiate(err);
      }

      if (!identity) {
        return res.send({
          balance: null,
          message: 'No user with such phone number in Kora database'
        });
      }

      TokensService.balanceOf({address: identity}, (err, result) => {
        if (err) {
          return res.negotiate(err);
        }

        return res.send({
          balance: result,
          symbol: sails.config.ethereum.koraTokenSymbol,
          message: 'Get balance was success'
        });
      });
    });
  },

  /**
   * `TokensController.transferFromKora()`
   */
  transferFromKora: function (req, res) {
    const phone = req.param('phone');
    const value = parseFloat(req.param('value'));

    if (!phone || !value) {
      return res.send({
        transferred: false,
        message: 'Wrong or not all params was set'
      });
    }

    // if (!validation.phoneNumber.test(phone)) {
    //   return res.send({
    //     transferred: false,
    //     message: 'Phone number incorrect'
    //   });
    // }

    User.findOne({phone}).exec((err, user) => {
      if (err) {
        return res.negotiate(err);
      }

      if (!user) {
        return res.send({
          transferred: false,
          message: 'No user with such phone number in Kora database'
        });
      }

      TokensService.transferFromKora({ to: user.identity, value }, (err, result) => {
        if (err) {
          return res.negotiate(err);
        }

        return res.send({
          transferred: true,
          message: 'Transfer from Kora was successful',
          result
        });
      });
    });
  },

  /**
   * `TokensController.transfer()`
   */
  transfer: function (req, res) {
    const phone = req.param('phone');
    let password = req.param('password');
    const to = req.param('to');
    const value = parseFloat(req.param('value'));

    if (!password) {
      if (sails.config.environment === 'development') {
        // Password for development purposes
        password = 'qwer1234';
      } else {
        return res.send({
          transferred: false,
          message: 'Password must be set'
        });
      }
    }

    if (!phone || !password || !to || !value) {
      return res.send({
        transferred: false,
        message: 'Wrong or not all params was set'
      });
    }

    // if (!validation.phoneNumber.test(phone)) {
    //   return res.send({
    //     transferred: false,
    //     message: 'Phone number incorrect'
    //   });
    // }

    User.findOne({phone}).exec((err, user) => {
      if (err) {
        return res.negotiate(err);
      }

      if (!user) {
        return res.send({
          transferred: false,
          message: 'No user with such phone number in Kora database'
        });
      }

      User.findOne({phone: to}).exec((err, toUser) => {
        if (err) {
          return res.negotiate(err);
        }

        if (!toUser) {
          return res.send({
            transferred: false,
            message: 'No user with such phone number in Kora database'
          });
        }

        const account = EthereumService.decryptAccount({keystore: user.keystore, password});

        TokensService.transfer({ account, identity: user.identity, to: toUser.identity, value }, (err, result) => {
          if (err) {
            return res.negotiate(err);
          }

          return res.send({
            transferred: true,
            message: 'Transfer from Kora was successful',
            result
          });
        });
      });
    });
  }
};
