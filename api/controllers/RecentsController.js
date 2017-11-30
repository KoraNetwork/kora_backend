/**
 * RecentsController
 *
 * @description :: Server-side logic for managing recents
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Recents User ErrorService */

const RECENTS_NUM = 10;

module.exports = {
  find: function (req, res) {
    findRecents({userId: req.user.id})
      .then(records => (records && records.length ? records.map(r => r.recent) : []))
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  contacts: function (req, res) {
    return findRecentsContacts({
      userId: req.user.id,
      allParams: req.allParams()
    })
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  agents: function (req, res) {
    return findRecentsContacts({
      userId: req.user.id,
      allParams: req.allParams(),
      role: User.constants.roles.agent
    })
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  add: function (req, res) {
    const userId = req.user.id;
    const id = req.param('id');

    if (!id) {
      return res.badRequest({message: 'Id of recent user must be set'});
    }

    if (id === userId) {
      return res.badRequest({message: 'Id of recent user could not be current user id'});
    }

    let newRecord = {user: userId, recent: id};

    User.findOne({id})
      .then(recent => {
        if (!recent) {
          return Promise.reject(ErrorService.throw({
            status: 400,
            message: 'Could not find a user with such id'
          }));
        }

        return Recents.findOne(newRecord);
      })
      .then(record => {
        if (record) {
          return new Promise((resolve, reject) => record.save(err => {
            if (err) {
              return reject(err);
            }

            return resolve();
          }));
        }

        return Recents.create(newRecord);
      })
      .then(() => findRecents({userId}))
      .then(records => {
        if (records.length > RECENTS_NUM) {
          let lastRecord = records.pop();

          return Recents.destroy({id: lastRecord.id})
            .then(() => records);
        }

        return records;
      })
      .then(records => records.map(r => r.recent))
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  }
};

function findRecents ({userId, where = {}, not = []}) {
  return Recents.find({
    where: {user: userId},
    sort: 'updatedAt DESC'
  })
    .populate('recent', where)
    .then(records => records.filter(r => (r.recent && !~not.indexOf(r.recent.id))));
}

function findRecentsContacts ({userId, allParams, role}) {
  let {
    search = '',
    not = [],
    limit = 10,
    skip = 0,
    sort = 'userName'
  } = allParams;

  let where = {
    or: [
      {phone: {contains: search}},
      {userName: {contains: search}},
      {email: {contains: search}},
      {legalName: {contains: search}}
    ]
  };

  if (role) {
    where.role = role;
  }

  not = Array.isArray(not) ? not : [not];

  let recents;

  return findRecents({userId, where, not})
    .then(records => {
      recents = records && records.length ? records.map(r => r.recent) : [];

      not.push(userId);
      where.id = {
        not: not.concat(recents.map(({id}) => id))
      };

      return Promise.all([
        User.find({ where, limit, skip, sort }),
        User.count(where)
      ]);
    })
    .then(([contacts, total]) => {
      let result = {recents, contacts, total};

      // eslint-disable-next-line eqeqeq
      if (skip != 0) {
        delete result.recents;
      }

      return result;
    });
}
