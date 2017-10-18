/**
 * Recents.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    user: { model: 'user' },

    recents: { collection: 'user' },

    addedAtDates: { type: 'json', defaultsTo: {} }
  },

  indexes: [{
    attributes: { user: 1 },
    options: { unique: true }
  }]
};
