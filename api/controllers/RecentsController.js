/**
 * RecentsController
 *
 * @description :: Server-side logic for managing recents
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Recents User */

const RECENTS_NUM = 10;

module.exports = {
  index: function (req, res) {
    Recents.findOne({user: req.user.id})
      .populate('recents')
      .then(record => res.json(record ? sortRecents(record) : []))
      .catch(err => res.negotiate(err));
  },

  contacts: function (req, res) {
    const userId = req.user.id;
    let {
      search = '',
      not = [],
      limit = 10,
      skip = 0,
      sort = 'userName'
    } = req.allParams();

    let where = {
      or: [
        {phone: {contains: search}},
        {userName: {contains: search}},
        {email: {contains: search}},
        {legalName: {contains: search}}
      ]
    };

    not = Array.isArray(not) ? not : [not];
    where.phone = {not};

    let recents;

    Recents.findOne({user: userId})
      .populate('recents', {where})
      .then(record => {
        recents = record ? sortRecents(record) : [];
        where.phone = {
          not: not.concat(recents.map(({phone}) => phone))
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
      })
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  },

  add: function (req, res) {
    const id = req.param('id');

    if (!id) {
      return res.badRequest({message: 'Id of recent user must be set'});
    }

    if (id === req.user.id) {
      return res.badRequest({message: 'Id of recent user could not be current user id'});
    }

    Recents.findOrCreate({user: req.user.id}, {user: req.user.id})
      .populate('recents')
      .exec((err, record) => {
        if (err) {
          return res.negotiate(err);
        }

        User.findOne({id}).exec((err, recent) => {
          if (err) {
            return res.negotiate(err);
          }

          if (!recent) {
            return res.notFound({message: 'Could not find a user with such id'});
          }

          let recents = record.recents;

          if (recents.length === RECENTS_NUM && !recents.some(el => (el.id === recent.id))) {
            let oldestId = findOldestId(record.addedAtDates);

            delete record.addedAtDates[oldestId];
            recents.remove(oldestId);
          }

          return addToRecents({record, recent}, (err, result) => {
            if (err) {
              return res.negotiate(err);
            }

            return res.json(sortRecents(result));
          });
        });
      });
  }
};

function sortRecents (record) {
  let addedAtDates = record.addedAtDates;

  return record.recents.sort((a, b) => (
    Date.parse(addedAtDates[a.id]) < Date.parse(addedAtDates[b.id])
  ));
}

function findOldestId (addedAtDates) {
  let recentIds = Object.keys(addedAtDates);

  return recentIds.reduce((oldest, current) => {
    if (Date.parse(addedAtDates[current]) < Date.parse(addedAtDates[oldest])) {
      return current;
    }
    return oldest;
  }, recentIds[0]);
}

function addToRecents ({record, recent}, cb) {
  record.recents.add(recent.id);
  record.addedAtDates[recent.id] = new Date();

  record.save(err => {
    if (err) {
      return cb(err);
    }

    Recents.findOne({id: record.id}).populate('recents')
      .exec((err, result) => {
        if (err) {
          return cb(err);
        }

        return cb(null, result);
      });
  });
}
