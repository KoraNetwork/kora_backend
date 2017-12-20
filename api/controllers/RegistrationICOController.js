/**
 * RegistrationICOController
 *
 * @description :: Server-side logic for managing Registrationicoes
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails MiscService RegistrationICO User */

const {accountSid, authToken, fromNumber} = sails.config.twilio;

const Twilio = require('twilio');
require('web3-eth-accounts');
const client = new Twilio(accountSid, authToken);

module.exports = {

  /**
   * `RegistrationICOController.sendCode()`
   */
  sendCode: function (req, res) {
    let userName = req.param('userName').toLowerCase();

    if (!userName) {
      return res.badRequest({message: 'Username must be set'});
    }

    User.findOne({userName}).exec((err, user) => {
      if (err) {
        return res.negotiate(err);
      }

      if (!user) {
        return res.badRequest({message: 'User with such username not exists in Kora MVP'});
      }

      let code = MiscService.randomInteger4().toString();

      client.messages.create({
        body: `Your code for Kora ICO registration - ${code}`,
        to: `+${user.phone}`,
        from: fromNumber
      })
        .then((message) => new Promise((resolve, reject) => {
          const cb = (err) => {
            if (err) {
              return reject(err);
            }

            const text = 'SMS message with verification code was send to phone number that is connected to Kora MVP account';

            sails.log.info(`${text} to ${user.phone}. Massage sid: ${message.sid}`);

            return resolve({message: text});
          };

          RegistrationICO.findOne({userName}).exec((err, record) => {
            if (err) {
              return reject(err);
            }

            if (record) {
              RegistrationICO.update({userName}, {code}).exec(cb);
            } else {
              RegistrationICO.create({userName, code}).exec(cb);
            }
          });
        }))
        .then(result => res.send(result))
        .catch(err => res.negotiate(err));
    });
  },

  /**
   * `RegistrationICOController.verifyCode()`
   */
  verifyCode: function (req, res) {
    let userName = req.param('userName').toLowerCase();
    let code = req.param('code');

    RegistrationICO.findOne({userName}).exec((err, record) => {
      if (err) {
        return res.negotiate(err);
      }

      if (!record) {
        return res.badRequest({message: 'Verification code was not send to you throught Kora MVP'});
      }

      if (code !== record.code) {
        return res.badRequest({message: 'Wrong verification code. Try to retype or resend'});
      }

      RegistrationICO.destroy({userName}, err => {
        if (err) {
          return res.negotiate(err);
        }

        return res.send({message: 'Verification code was confirmed throught Kora MVP'});
      });
    });
  }
};
