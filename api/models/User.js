/**
 * User.js
 *
 * @description :: Kora Network user model.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global sails EthereumService */

module.exports = {
  attributes: {
    phone: { type: 'string', unique: true, required: true },

    address: { type: 'string' },

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

    const {account: { address }, keystore} = EthereumService.createAccount({password});

    values.address = address;
    values.keystore = keystore;
    delete values.password;

    return cb();
  }
};
