/**
 * TokensController
 *
 * @description :: Server-side logic for managing tokens
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails TokensService User */

// const validation = sails.config.validation;

module.exports = {

  /**
   * `TokensController.transferFromKora()`
   */
  transferFromKora: function (req, res) {
    const phone = req.param('phone');
    const value = parseFloat(req.param('value'));

    if (!phone || !value) {
      return res.send({
        transferred: false,
        message: 'Wrong or not all params was set'
      });
    }

    // if (!validation.phoneNumber.test(phone)) {
    //   return res.send({
    //     transferred: false,
    //     message: 'Phone number incorrect'
    //   });
    // }

    User.findOne({phone}).exec((err, user) => {
      if (err) {
        return res.negotiate(err);
      }

      if (!user) {
        return res.send({
          transferred: false,
          message: 'No user with such phone number in Kora database'
        });
      }

      TokensService.transferFromKora({ to: user.identity, value }, (err, result) => {
        if (err) {
          return res.negotiate(err);
        }

        return res.send({
          transferred: true,
          message: 'Transfer from Kora was successful',
          result
        });
      });
    });
  }
};
