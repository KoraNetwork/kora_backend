/**
 * User.js
 *
 * @description :: Kora Network user model.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global sails EthereumService ValidationService CountriesService */

// We don't want to store password with out encryption
const bcrypt = require('bcrypt');

const WLError = require('waterline/lib/waterline/error/WLError');

const roles = {
  // agent: 'agent',
  // provider: 'provider',
  featurePhone: 'featurePhone',
  smartPhone: 'smartPhone'
};

module.exports = {
  roles,

  attributes: {
    // TODO: Add validation for phone and maybe password
    phone: { type: 'string', required: true, phoneNumber: true },

    userName: { type: 'string', required: true, alphanumericdashed: true },

    userNameOrigin: { type: 'string' },

    email: { type: 'string', email: true },

    legalName: { type: 'string' },

    dateOfBirth: { type: 'string' }, // datetime: true

    currency: { type: 'string', in: CountriesService.list.map(el => el.currency) },

    countryCode: { type: 'string', in: CountriesService.list.map(el => el.countryCode) },

    ERC20Token: { type: 'string', address: true, in: CountriesService.list.map(el => el.ERC20Token) },

    postalCode: { type: 'string' },

    address: { type: 'string' },

    identity: { type: 'string', address: true, required: true },

    creator: { type: 'string', address: true },

    owner: { type: 'string', address: true },

    recoveryKey: { type: 'string', address: true },

    keystore: { type: 'json' },

    avatar: { type: 'string' },

    role: {
      type: 'string',
      in: [roles.featurePhone, roles.smartPhone],
      defaultsTo: roles.featurePhone
    },

    encryptedPassword: {
      type: 'string'
    },

    // We don't wan't to send back encrypted password either
    toJSON: function () {
      var obj = this.toObject();

      obj.userName = obj.userNameOrigin;
      delete obj.userNameOrigin;
      delete obj.encryptedPassword;
      delete obj.keystore;

      if (obj.countryCode) {
        obj.flag = CountriesService.flagImg(obj.countryCode);
        obj.currencyName = CountriesService.collection[obj.countryCode].currencyName;
        obj.currencyNameFull = CountriesService.collection[obj.countryCode].currencyNameFull;
      }

      return obj;
    }
  },

  types: {
    phoneNumber: value => ValidationService.phoneNumber(value),
    address: value => ValidationService.address(value)
  },

  indexes: [
    {
      attributes: { phone: 1 },
      options: { unique: true }
    }, {
      attributes: { userName: 1 },
      options: { unique: true }
    }, {
      attributes: { email: 1 },
      options: {
        unique: true,
        partialFilterExpression: {email: {$exists: true}}
      }
    }
  ],

  beforeCreate: function (values, cb) {
    let password = values.password;

    delete values.password;

    if (!password) {
      if (sails.config.environment === 'development') {
        // Password for development purposes
        password = 'qwer1234';
      } else {
        return cb(new WLError({status: 422, reason: 'Password must be set'}));
      }
    }

    values.userNameOrigin = values.userName;
    values.userName = values.userName.toLowerCase();

    if (values.email) {
      values.email = values.email.toLowerCase();
    }

    if (values.countryCode) {
      values.currency = CountriesService.collection[values.countryCode].currency;
      values.ERC20Token = CountriesService.collection[values.countryCode].ERC20Token;
    }

    if (values.role === roles.featurePhone) {
      const {account, keystore} = EthereumService.createAccount({password});

      EthereumService.createIdentity({account}, (err, { identity, creator, owner, recoveryKey }) => {
        if (err) {
          return cb(err);
        }

        Object.assign(values, {identity, creator, owner, recoveryKey, keystore});

        return cb();
      });
    } else {
      bcrypt.genSalt(10, function (err, salt) {
        if (err) {
          return cb(err);
        }

        bcrypt.hash(password, salt, function (err, hash) {
          if (err) {
            return cb(err);
          }

          values.encryptedPassword = hash;

          return cb();
        });
      });
    }
  },

  comparePassword: function (password, user, cb) {
    bcrypt.compare(password, user.encryptedPassword, function (err, match) {
      if (err) {
        return cb(err);
      }

      return cb(null, match);
    });
  },

  findOneUnique: function (identifier, cb) {
    this.findOne({$or: [
      {phone: identifier},
      {userName: identifier.toLowerCase()},
      {email: identifier.toLowerCase()}
    ]})
      .then(user => cb(null, user))
      .catch(err => cb(err));
  }
};
