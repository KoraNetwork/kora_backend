/**
 * UserService
 * @description :: Set of methods for User
 */

/* global User */

const WLError = require('waterline/lib/waterline/error/WLError');

module.exports = {
  isFromToExists: function ({from, to}, cb) {
    const promise = Promise.all([
      User.findOne({id: from}),
      User.findOne({id: to})
    ])
      .then(([fromUser, toUser]) => {
        if (!fromUser) {
          return Promise.reject(new WLError({status: 404, reason: 'From user not exists'}));
        }

        if (!toUser) {
          return Promise.reject(new WLError({status: 404, reason: 'To user not exists'}));
        }

        return Promise.resolve();
      });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  }
};
