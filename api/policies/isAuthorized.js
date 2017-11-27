/**
 * isAuthorized
 *
 * @description :: Policy to check if user is authorized with JSON web token
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Policies
 */

module.exports = function (req, res, next) {
  // req.user creates in sessionTokenHook
  if (!req.user) {
    return res.json(401, {message: 'No Session-Token header was found'});
  }

  return next();
};
