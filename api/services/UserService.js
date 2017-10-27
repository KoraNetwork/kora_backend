/**
 * UserService
 * @description :: Set of methods for User
 */

/* global User */

const WLError = require('waterline/lib/waterline/error/WLError');

module.exports = {
  isFromToNotEqual: function ({from, to}, cb) {
    let promise = Promise.resolve();

    if (from && to && from === to) {
      promise = Promise.reject(new WLError({
        status: 400,
        reason: 'From and to users could not be equal'
      }));
    }

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  isUserNotInUsers: function ({user, users, userName = 'This', usersName = 'users'}, cb) {
    let promise = Promise.resolve();

    if (user && users && users.some(u => u === user)) {
      promise = Promise.reject(new WLError({
        status: 400,
        reason: `${userName} user could not be in ${usersName} collection`
      }));
    }

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

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
  },

  isUsersExists: function ({users, name = 'Users'}, cb) {
    const promise = !(users && users.length) ? Promise.resolve()
      : Promise.all(users)
        .then(records => {
          let indexes = records.filter((record, index) => !record ? index : false);

          if (indexes.length) {
            return Promise.reject(new WLError({
              status: 404,
              reason: `${name} with indexes ${indexes.join(', ')} not exists`
            }));
          }

          return Promise.resolve();
        });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  }
};
