/**
 * User.js
 *
 * @description :: Kora Network user model.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global sails EthereumService ValidationService */

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

    userNameUnique: { type: 'string' },

    email: { type: 'string', email: true },

    legalName: { type: 'string' },

    dateOfBirth: { type: 'string', datetime: true },

    currency: { type: 'string' },

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
      delete obj.encryptedPassword;
      delete obj.userNameUnique;
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
      attributes: { userNameUnique: 1 },
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
        return cb(new WLError({status: 400, reason: 'Password must be set'}));
      }
    }

    values.userNameUnique = values.userName.toLowerCase();

    if (values.email) {
      values.email = values.email.toLowerCase();
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

      if (match) {
        cb(null, true);
      } else {
        cb(err);
      }
    });
  }
};
