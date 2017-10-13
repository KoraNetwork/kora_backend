/**
 * isMyProfile
 *
 * @description :: Policy
 */

module.exports = function (req, res, next) {
  if (!req.user || req.params.id !== req.user.id) {
    return res.send(403, {message: 'Access denied. Not your profile'});
  }

  return next();
};
