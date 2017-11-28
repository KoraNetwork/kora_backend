/**
 * ProfileController
 *
 * @description :: Server-side logic for managing profiles
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails User */

const path = require('path');
const fs = require('fs');

module.exports = {

  /**
   * `ProfileController.index()`
   */
  index: function (req, res) {
    switch (req.method) {
      case 'GET':
        return res.json(req.user);

      case 'PUT':
        let values = req.allParams();

        delete values.role;
        delete values.password;
        delete values.encryptedPassword;
        delete values.userNameOrigin;
        delete values.avatar;

        if (values.agent) {
          values.role = User.constants.roles.agent;
        } else {
          values.role = User.constants.roles.smartPhone;
        }

        return User.update({id: req.user.id}).set(values).exec((err, updated) => {
          if (err) {
            return res.negotiate(err);
          }

          return res.json(updated[0]);
        });

      default:
        return res.send(405, 'Method not allowed');
    }
  },

  /**
   * `ProfileController.avatar()`
   */
  avatar: function (req, res) {
    // TODO: Refactor profile/avatar
    const id = req.user.id;

    if (!id) {
      return res.badRequest({message: 'User id param must be set'});
    }

    req.file('avatar').upload({
      dirname: '../../assets/images/avatars'
    }, (err, uploadedFiles) => {
      if (err) {
        return res.negotiate(err);
      }

      if (uploadedFiles.length && uploadedFiles[0].fd) {
        User.findOne({id}).exec((err, user) => {
          if (err) {
            return res.negotiate(err);
          }

          if (!user) {
            return res.badRequest({message: 'User is not exists'});
          }

          let oldAvatar = user.avatar;

          user.avatar = path.join('/images', 'avatars', path.basename(uploadedFiles[0].fd));
          user.save(err => {
            if (err) {
              return res.negotiate(err);
            }

            if (oldAvatar) {
              return fs.unlink('./assets' + oldAvatar, (err) => {
                if (err) {
                  sails.log.error(err);
                }

                return res.json(user);
              });
            }

            return res.json(user);
          });
        });
      }
    });
  }
};
