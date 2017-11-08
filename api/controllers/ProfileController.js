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
    if (req.method === 'POST' || req.method === 'PUT') {
      let values = req.allParams();

      if (values.encryptedPassword) {
        delete values.encryptedPassword;
      }

      if (values.avatar) {
        delete values.avatar;
      }

      return User.update({id: req._sails.user.id}).set(values).exec((err, user) => {
        if (err) {
          return res.negotiate(err);
        }

        return res.json(user.pop());
      });
    }

    return res.json(req._sails.user);
  },

  /**
   * `ProfileController.avatar()`
   */
  avatar: function (req, res) {
    const id = req._sails.user.id;

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
