/**
 * User.js
 *
 * @description :: Kora Network user model.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global sails EthereumService */

// We don't want to store password with out encryption
const bcrypt = require('bcrypt');

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
    phone: { type: 'string', unique: true, required: true },

    userName: { type: 'string', unique: true, required: true, alphanumericdashed: true },

    legalName: { type: 'string' },

    email: { type: 'string', unique: true, email: true },

    dateOfBirth: { type: 'string', datetime: true },

    currency: { type: 'string' },

    postalCode: { type: 'string' },

    address: { type: 'string' },

    identity: { type: 'string' },

    creator: { type: 'string' },

    owner: { type: 'string' },

    recoveryKey: { type: 'string' },

    keystore: { type: 'json' },

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
      return obj;
    }
  },

  beforeCreate: function (values, cb) {
    let password = values.password;

    delete values.password;

    if (!password) {
      if (sails.config.environment === 'development') {
        // Password for development purposes
        password = 'qwer1234';
      } else {
        return cb(new Error('Password must be set'));
      }
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
