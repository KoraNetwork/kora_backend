/**
 * ContactsController
 *
 * @description :: Server-side logic for managing contacts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global User */

module.exports = {

  /**
   * `ContactsController.index()`
   */
  index: function (req, res) {
    const {
      search = '',
      limit = 30,
      skip = 0,
      sort = 'userName'
    } = req.allParams();

    User.find({
      where: {
        or: [
          {phone: {contains: search}},
          {userName: {contains: search}},
          {email: {contains: search}},
          {legalName: {contains: search}}
        ]
      },
      limit,
      skip,
      sort
    })
    .then(result => res.json(result))
    .catch(err => res.serverError(err));
  }
};
