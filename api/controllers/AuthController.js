/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

/* global User JWTokenService */

module.exports = {
  index: function (req, res) {
    var phone = req.param('phone');
    var password = req.param('password');

    if (!phone || !password) {
      return res.json(401, {err: 'phone and password required'});
    }

    User.findOne({phone: phone}, function (err, user) {
      if (err) {
        return res.json(err.status, {err: err});
      }

      if (!user) {
        return res.json(401, {err: 'invalid phone or password'});
      }

      User.comparePassword(password, user, function (err, valid) {
        if (err) {
          return res.json(403, {err: 'forbidden'});
        }

        if (!valid) {
          return res.json(401, {err: 'invalid phone or password'});
        } else {
          res.json({
            user: user,
            token: JWTokenService.issue({id: user.id})
          });
        }
      });
    });
  }
};
