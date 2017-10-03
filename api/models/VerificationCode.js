/**
 * VerificationCode.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    phoneNumber: { type: 'string', required: true },

    verificationCode: { type: 'string', required: true }

  },

  indexes: [
    {
      attributes: { phone: 1 },
      options: { unique: true }
    }
  ]
};
