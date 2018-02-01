/**
 * UserValidationService
 * @description :: Set of methods for User
 */

/* global User ErrorService */

module.exports = {
  isFromToNotEqual: function ({from, to}, cb) {
    let promise = Promise.resolve();

    if (from && to && from === to) {
      promise = Promise.reject(ErrorService.new({
        status: 400,
        message: 'From and to users could not be equal'
      }));
    }

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  isIdsNotEqual: function ({ids, names}, cb) {
    let promise = Promise.resolve();

    for (let i = 0; i < ids.length - 1; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (ids[i] === ids[j]) {
          promise = Promise.reject(ErrorService.new({
            status: 400,
            message: `Users ${names[i]} and ${names[j]} could not be equal`
          }));
          break;
        }
      }
    }

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  isUserNotInUsers: function ({user, users, userName = 'This', usersName = 'users'}, cb) {
    let promise = Promise.resolve();

    if (user && users && users.some(u => u === user)) {
      promise = Promise.reject(ErrorService.new({
        status: 400,
        message: `${userName} user could not be in ${usersName} collection`
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
          return Promise.reject(ErrorService.new({status: 404, message: 'From user not exists'}));
        }

        if (!toUser) {
          return Promise.reject(ErrorService.new({status: 404, message: 'To user not exists'}));
        }

        return Promise.resolve();
      });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  isUsersExists: function ({ users, names }, cb) {
    const promise = !(users && users.length) ? Promise.resolve()
      : Promise.all(users.map(id => User.findOne({id})))
        .then(records => {
          let notExistsNames = [];

          records.forEach((r, i) => {
            if (!r) {
              notExistsNames.push(names[i]);
            }
          });

          if (notExistsNames.length) {
            return Promise.reject(ErrorService.new({
              status: 404,
              message: `User${notExistsNames.length !== 1 ? 's' : ''} ${notExistsNames.join(', ')} not exists`
            }));
          }

          return Promise.resolve();
        });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  isAgent: function ({id, name = 'This'}, cb) {
    let promise = User.findOne({id})
      .then(user => {
        if (!user) {
          return Promise.reject(ErrorService.new({status: 404, message: 'Agent not exists'}));
        }

        if (user.role !== User.constants.roles.agent) {
          return Promise.reject(ErrorService.new({status: 400, message: `${name} user not agent`}));
        }

        return Promise.resolve();
      });

    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  }
};
