/**
 * SmsController
 *
 * @description :: Server-side logic for managing sms
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails MiscService VerificationCode ValidationService User */

const {accountSid, authToken, fromNumber} = sails.config.twilio;

const Twilio = require('twilio');
const client = new Twilio(accountSid, authToken);

module.exports = {

  /**
   * `VerificationCodeController.send()`
   */
  send: function (req, res) {
    let phoneNumber = req.param('phoneNumber');

    if (!ValidationService.phoneNumber(phoneNumber)) {
      return res.send(422, 'Phone number incorrect');
    }

    User.findOne({phone: phoneNumber}).exec((err, user) => {
      if (err) {
        return res.serverError(err);
      }

      if (user) {
        return res.send(422, 'User with this phone number already registered');
      }

      let verificationCode = MiscService.randomInteger4().toString();

      client.messages.create({
        body: `Your code for Kora MVP - ${verificationCode}`,
        to: `+${phoneNumber}`,
        from: fromNumber
      })
        .then((message) => new Promise((resolve, reject) => {
          const cb = (err) => {
            if (err) {
              return reject(err);
            }

            const text = 'SMS message with verification code was send';

            sails.log.info(`${text} to ${phoneNumber}. Massage sid: ${message.sid}`);

            return resolve(text);
          };

          VerificationCode.findOne({phoneNumber}).exec((err, record) => {
            if (err) {
              return reject(err);
            }

            if (record) {
              VerificationCode.update({phoneNumber}, {verificationCode}).exec(cb);
            } else {
              VerificationCode.create({phoneNumber, verificationCode}).exec(cb);
            }
          });
        }))
        .then(result => res.send(result))
        .catch(err => {
          // eslint-disable-next-line eqeqeq
          if (err.status == 400) {
            return res.send(422, err);
          }

          return res.serverError(err);
        });
    });
  },

  /**
   * `VerificationCodeController.confirm()`
   */
  confirm: function (req, res) {
    let phoneNumber = req.param('phoneNumber');
    let verificationCode = req.param('verificationCode');

    VerificationCode.findOne({phoneNumber}).exec((err, record) => {
      if (err) {
        return res.serverError(err);
      }

      if (!record) {
        return res.send(422, 'Verification code was not send to you');
      }

      if (verificationCode !== record.verificationCode) {
        return res.send(422, 'Verification code incorrect');
      }

      VerificationCode.destroy({phoneNumber}, err => {
        if (err) {
          sails.log.error(err);
        }
      });

      return res.send('Verification code confirmed');
    });
  }
};
