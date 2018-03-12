/**
 * isEmailVerified
 *
 * @description :: Policy to check if user has verified email. Add it after isAuthorized policy
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Policies
 */

module.exports = function (req, res, next) {
  // req.user creates in sessionTokenHook
  if (!(req.user && req.user.emailVerified)) {
    return res.json(401, {message: 'Verify you email first'});
  }

  return next();
};
