/**
 * User.js
 *
 * @description :: Kora Network user model.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global sails EthereumService */

module.exports = {
  attributes: {
    // TODO: Add validation for phone and maybe password
    phone: { type: 'string', unique: true, required: true },

    identity: { type: 'string' },

    creator: { type: 'string' },

    owner: { type: 'string' },

    recoveryKey: { type: 'string' },

    keystore: { type: 'json' }
  },

  beforeCreate: function (values, cb) {
    let password = values.password;

    if (!password) {
      if (sails.config.environment === 'development') {
        // Password for development purposes
        password = 'qwer1234';
      } else {
        return cb(new Error('Password must be set'));
      }
    }

    const {account, keystore} = EthereumService.createAccount({password});

    delete values.password;

    EthereumService.createIdentity({account}, (err, { identity, creator, owner, recoveryKey }) => {
      if (err) {
        return cb(err);
      }

      Object.assign(values, {identity, creator, owner, recoveryKey, keystore});

      return cb();
    });
  }
};
