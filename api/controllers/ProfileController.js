/**
 * ProfileController
 *
 * @description :: Server-side logic for managing profiles
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails User EthereumService ValidationService TokensService CurrencyConverterService ErrorService */

const {provider, koraWallet, newUserMoney} = sails.config.ethereum;

const path = require('path');
const fs = require('fs');
const Web3Utils = require('web3-utils');

const Eth = require('web3-eth');
const eth = new Eth(provider);

module.exports = {

  /**
   * `ProfileController.index()`
   */
  index: function (req, res) {
    switch (req.method) {
      case 'GET':
        return res.json(req.user);

      case 'PUT':
        let values = req.allParams();

        delete values.role;
        delete values.password;
        delete values.encryptedPassword;
        delete values.userNameOrigin;
        delete values.avatar;
        delete values.identity;
        delete values.creator;
        delete values.owner;
        delete values.recoveryKey;

        values.agent = (typeof values.agent === 'string') ? values.agent !== 'false' : !!values.agent;

        if (values.agent) {
          values.role = User.constants.roles.agent;
        } else {
          values.role = User.constants.roles.smartPhone;
        }

        if (typeof values.interestRate !== 'undefined') {
          values.interestRate = parseFloat(values.interestRate, 10);
        }

        return User.update({id: req.user.id}).set(values).exec((err, updated) => {
          if (err) {
            return res.negotiate(err);
          }

          return res.json(updated[0]);
        });

      default:
        return res.send(405, 'Method not allowed');
    }
  },

  /**
   * `ProfileController.avatar()`
   */
  avatar: function (req, res) {
    // TODO: Refactor profile/avatar
    const id = req.user.id;

    if (!id) {
      return res.badRequest({message: 'User id param must be set'});
    }

    req.file('avatar').upload({
      dirname: '../../assets/images/avatars'
    }, (err, uploadedFiles) => {
      if (err) {
        return res.negotiate(err);
      }

      if (uploadedFiles.length && uploadedFiles[0].fd) {
        User.findOne({id}).exec((err, user) => {
          if (err) {
            return res.negotiate(err);
          }

          if (!user) {
            return res.badRequest({message: 'User is not exists'});
          }

          let oldAvatar = user.avatar;

          user.avatar = path.join('/images', 'avatars', path.basename(uploadedFiles[0].fd));
          user.save(err => {
            if (err) {
              return res.negotiate(err);
            }

            if (oldAvatar) {
              return fs.unlink('./assets' + oldAvatar, (err) => {
                if (err) {
                  sails.log.error(err);
                }

                return res.json(user);
              });
            }

            return res.json(user);
          });
        });
      }
    });
  },

  confirmEmail: function (req, res) {
    const token = req.param('token');

    User.findOne({emailVerificationToken: token})
      .then(user => {
        if (!user) {
          return Promise.reject(ErrorService.throw({message: 'No user with such token found', status: 404}));
        }

        return User.update({id: user.id}, {emailVerified: true});
      })
      .then(result => res.ok(result))
      .catch(err => {
        return res.badRequest(err);
      });
  },

  createIdentity: function (req, res) {
    let { owner, recoveryKey } = req.allParams();

    if (req.user.identity) {
      return res.badRequest({message: `Current user already has identity`});
    }

    if (!owner && !ValidationService.ethereumAddress(owner)) {
      return res.badRequest({message: `Param 'owner' must be set and must be ethereum address`});
    }

    if (!recoveryKey && !ValidationService.ethereumAddress(recoveryKey)) {
      return res.badRequest({message: `Param 'recoveryKey' must be set and must be ethereum address`});
    }

    // e.g.
    // 0 => infinite
    // 240000 => 4 minutes (240,000 miliseconds)
    // etc.
    //
    // Node defaults to 2 minutes.
    res.setTimeout(0);

    EthereumService.createIdentity({owner, recoveryKey})
      .then(({ identity, creator, owner, recoveryKey }) => {
        return User.update({id: req.user.id}, { identity, creator, owner, recoveryKey });
      })
      .then(records => records[0])
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  sendEthFromKora: function (req, res) {
    if (!req.user.owner) {
      return res.badRequest({message: `Current user do not has owner`});
    }

    res.setTimeout(0);

    EthereumService.getBalance({address: req.user.owner}, (err, balance) => {
      if (err) {
        return res.negotiate(err);
      }

      sails.log.info('balance', balance);
      if (!Web3Utils.toBN(balance).isZero()) {
        return res.badRequest({message: `User owner address already has ethers`});
      }

      EthereumService.sendEthFromKora({to: req.user.owner, eth: newUserMoney.ETH + ''})
        .then(result => res.ok(result))
        .catch(err => res.negotiate(err));
    });
  },

  transferFromKora: function (req, res) {
    const user = req.user;

    if (!user.identity) {
      return res.badRequest({message: `Current user do not has identity`});
    }

    res.setTimeout(0);

    TokensService.balanceOf({
      address: user.identity,
      tokenAddress: user.ERC20Token
    }, (err, balance) => {
      if (err) {
        return res.negotiate(err);
      }

      sails.log.info('balance', balance);
      if (!Web3Utils.toBN(balance).isZero()) {
        return res.badRequest({message: `User identity address already has eFiats`});
      }

      let promise;

      if (user.currency === 'USD') {
        promise = Promise.resolve(newUserMoney.eUSD);
      } else {
        const currencyPair = 'USD_' + user.currency;

        promise = CurrencyConverterService.convert(currencyPair)
          .then(result => result[currencyPair] * newUserMoney.eUSD);
      }

      promise
        .then(value =>
          TokensService.transferFromKora({
            to: user.identity,
            value,
            tokenAddress: user.ERC20Token
          })
        )
        .then(result => res.ok(result))
        .catch(err => res.negotiate(err));
    });
  },

  sendMoneyFromKora: function (req, res) {
    const user = req.user;

    if (!req.user.owner) {
      return res.badRequest({message: `Current user do not has owner`});
    }

    if (!user.identity) {
      return res.badRequest({message: `Current user do not has identity`});
    }

    res.setTimeout(0);

    eth.getTransactionCount(koraWallet.address)
      .then(nonce =>
        Promise.all([
          EthereumService.getBalance({address: user.owner}),
          TokensService.balanceOf({address: user.identity, tokenAddress: user.ERC20Token})
        ])
          .then(([ethBalance, tokenBalance]) => {
            let promises = [];
            console.log(nonce);

            if (Web3Utils.toBN(ethBalance).isZero()) {
              promises.push(
                EthereumService.sendEthFromKora({to: req.user.owner, eth: newUserMoney.ETH + '', nonce: nonce + ''})
              );
            }

            if (Web3Utils.toBN(tokenBalance).isZero()) {
              let promise;

              if (user.currency === 'USD') {
                promise = Promise.resolve(newUserMoney.eUSD);
              } else {
                const currencyPair = 'USD_' + user.currency;

                promise = CurrencyConverterService.convert(currencyPair)
                  .then(result => result[currencyPair] * newUserMoney.eUSD);
              }

              promise = promise
                .then(value =>
                  TokensService.transferFromKora({
                    to: user.identity,
                    value,
                    tokenAddress: user.ERC20Token,
                    nonce: ++nonce + ''
                  })
                );

              promises.push(promise);
            }

            if (!promises.length) {
              return Promise.reject(ErrorService.throw({
                status: 400,
                message: 'User ethereum and eFiats balances are not empty'
              }));
            }

            return Promise.all(promises);
          })
      )
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  createIdentity: function (req, res) {
    let { owner, recoveryKey } = req.allParams();

    if (req.user.identity) {
      return res.badRequest({message: `Current user already has identity`});
    }

    if (!owner && !ValidationService.ethereumAddress(owner)) {
      return res.badRequest({message: `Param 'owner' must be set and must be ethereum address`});
    }

    if (!recoveryKey && !ValidationService.ethereumAddress(recoveryKey)) {
      return res.badRequest({message: `Param 'recoveryKey' must be set and must be ethereum address`});
    }

    // e.g.
    // 0 => infinite
    // 240000 => 4 minutes (240,000 miliseconds)
    // etc.
    //
    // Node defaults to 2 minutes.
    res.setTimeout(0);

    EthereumService.createIdentity({owner, recoveryKey})
      .then(({ identity, creator, owner, recoveryKey }) => {
        return User.update({id: req.user.id}, { identity, creator, owner, recoveryKey });
      })
      .then(records => records[0])
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  sendEthFromKora: function (req, res) {
    if (!req.user.owner) {
      return res.badRequest({message: `Current user do not has owner`});
    }

    res.setTimeout(0);

    EthereumService.getBalance({address: req.user.owner}, (err, balance) => {
      if (err) {
        return res.negotiate(err);
      }

      sails.log.info('balance', balance);
      if (!Web3Utils.toBN(balance).isZero()) {
        return res.badRequest({message: `User owner address already has ethers`});
      }

      EthereumService.sendEthFromKora({to: req.user.owner, eth: newUserMoney.ETH + ''})
        .then(result => res.ok(result))
        .catch(err => res.negotiate(err));
    });
  },

  transferFromKora: function (req, res) {
    const user = req.user;

    if (!user.identity) {
      return res.badRequest({message: `Current user do not has identity`});
    }

    res.setTimeout(0);

    TokensService.balanceOf({
      address: user.identity,
      tokenAddress: user.ERC20Token
    }, (err, balance) => {
      if (err) {
        return res.negotiate(err);
      }

      sails.log.info('balance', balance);
      if (!Web3Utils.toBN(balance).isZero()) {
        return res.badRequest({message: `User identity address already has eFiats`});
      }

      let promise;

      if (user.currency === 'USD') {
        promise = Promise.resolve(newUserMoney.eUSD);
      } else {
        const currencyPair = 'USD_' + user.currency;

        promise = CurrencyConverterService.convert(currencyPair)
          .then(result => result[currencyPair] * newUserMoney.eUSD);
      }

      promise
        .then(value =>
          TokensService.transferFromKora({
            to: user.identity,
            value,
            tokenAddress: user.ERC20Token
          })
        )
        .then(result => res.ok(result))
        .catch(err => res.negotiate(err));
    });
  },

  sendMoneyFromKora: function (req, res) {
    const user = req.user;

    if (!req.user.owner) {
      return res.badRequest({message: `Current user do not has owner`});
    }

    if (!user.identity) {
      return res.badRequest({message: `Current user do not has identity`});
    }

    res.setTimeout(0);

    eth.getTransactionCount(koraWallet.address)
      .then(nonce =>
        Promise.all([
          EthereumService.getBalance({address: user.owner}),
          TokensService.balanceOf({address: user.identity, tokenAddress: user.ERC20Token})
        ])
          .then(([ethBalance, tokenBalance]) => {
            let promises = [];
            console.log(nonce);

            if (Web3Utils.toBN(ethBalance).isZero()) {
              promises.push(
                EthereumService.sendEthFromKora({to: req.user.owner, eth: newUserMoney.ETH + '', nonce: nonce + ''})
              );
            }

            if (Web3Utils.toBN(tokenBalance).isZero()) {
              let promise;

              if (user.currency === 'USD') {
                promise = Promise.resolve(newUserMoney.eUSD);
              } else {
                const currencyPair = 'USD_' + user.currency;

                promise = CurrencyConverterService.convert(currencyPair)
                  .then(result => result[currencyPair] * newUserMoney.eUSD);
              }

              promise = promise
                .then(value =>
                  TokensService.transferFromKora({
                    to: user.identity,
                    value,
                    tokenAddress: user.ERC20Token,
                    nonce: ++nonce + ''
                  })
                );

              promises.push(promise);
            }

            if (!promises.length) {
              return Promise.reject(ErrorService.throw({
                status: 400,
                message: 'User ethereum and eFiats balances are not empty'
              }));
            }

            return Promise.all(promises);
          })
      )
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  }
};
