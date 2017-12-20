/**
 * RegistrationICO.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    userName: { type: 'string', required: true },

    code: { type: 'string', required: true }

  },

  indexes: [
    {
      attributes: { userName: 1 },
      options: { unique: true }
    }
  ]
};
