/**
 * isAuthorized
 *
 * @description :: Policy to check if user is authorized with JSON web token
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Policies
 */

module.exports = function (req, res, next) {
  // req._sails.user creates in sessionTokenHook
  if (!req._sails.user) {
    return res.json(401, {message: 'No Session-Token header was found'});
  }

  return next();
};
