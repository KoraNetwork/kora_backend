/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

/* global User JWTokenService */

const path = require('path');

module.exports = {
  register: function (req, res) {
    let allParams = req.allParams();

    // if (allParams.password !== allParams.confirmPassword) {
    //   return res.json(401, {err: 'Password doesn\'t match, What a shame!'})
    // }
    //
    // delete allParams.confirmPassword

    if (!allParams.role) {
      allParams.role = User.roles.smartPhone;
    }

    req.file('avatar').upload({
      dirname: '../../assets/images/avatars'
    }, function (err, uploadedFiles) {
      if (err) {
        return res.json(422, err);
      }

      if (uploadedFiles.length && uploadedFiles[0].fd) {
        allParams.avatar = path.join('/images', 'avatars', path.basename(uploadedFiles[0].fd));
      }

      User.create(allParams).exec(function (err, user) {
        if (err) {
          err.status = 422;
          return res.json(422, err);
        }

        // If user created successfuly we return user and token as response
        if (user) {
          // NOTE: payload is { id: user.id}
          return res.json(200, {
            user: user,
            sessionToken: JWTokenService.issue({id: user.id})
          });
        }
      });
    });
  },

  login: function (req, res) {
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
            sessionToken: JWTokenService.issue({id: user.id})
          });
        }
      });
    });
  }
};
