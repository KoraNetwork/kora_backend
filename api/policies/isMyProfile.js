/**
 * isMyProfile
 *
 * @description :: Policy
 */

module.exports = function (req, res, next) {
  if (!req._sails.user || req.params.id !== req._sails.user.id) {
    return res.send(403, {message: 'Access denied. Not your profile'});
  }

  return next();
};
