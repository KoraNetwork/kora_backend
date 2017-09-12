/**
 * User.js
 *
 * @description :: Kora Network user model.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    phone: { type: 'string', unique: true, required: true },

    address: { type: 'string' },

    keystore: { type: 'json' }
  }
};
