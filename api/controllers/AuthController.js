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
    //   return res.badRequest({message: 'Password doesn\'t match, What a shame!'})
    // }
    //
    // delete allParams.confirmPassword

    if (!allParams.role) {
      allParams.role = User.constants.roles.smartPhone;
    }

    req.file('avatar').upload({
      dirname: '../../assets/images/avatars'
    }, function (err, uploadedFiles) {
      if (err) {
        return res.negotiate(err);
      }

      if (uploadedFiles.length && uploadedFiles[0].fd) {
        allParams.avatar = path.join('/images', 'avatars', path.basename(uploadedFiles[0].fd));
      }

      User.create(allParams).exec(function (err, user) {
        if (err) {
          return res.negotiate(err);
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
    var identifier = req.param('identifier');
    var password = req.param('password');

    if (!identifier || !password) {
      return res.badRequest({message: 'Identifier and password required'});
    }

    User.findOneUnique(identifier, function (err, user) {
      if (err) {
        return res.negotiate(err);
      }

      if (!user) {
        return res.badRequest({message: 'Wrong identifier or password'});
      }

      User.comparePassword(password, user, function (err, valid) {
        if (err) {
          return res.negotiate(err);
        }

        if (!valid) {
          return res.badRequest({message: 'Wrong identifier or password'});
        } else {
          return res.json({
            user: user,
            sessionToken: JWTokenService.issue({id: user.id})
          });
        }
      });
    });
  },

  logout: function (req, res) {
    delete req.user;
    return res.ok({message: 'Fake logout success :)'});
  }
};
