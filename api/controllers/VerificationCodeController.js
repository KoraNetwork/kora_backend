/**
 * SmsController
 *
 * @description :: Server-side logic for managing sms
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails MiscService */

const {accountSid, authToken, fromNumber} = sails.config.twilio;

const Twilio = require('twilio');
const client = new Twilio(accountSid, authToken);

const validation = sails.config.validation;

module.exports = {

  /**
   * `VerificationCodeController.send()`
   */
  send: function (req, res) {
    let phoneNumber = req.param('phoneNumber');

    if (!validation.phoneNumber.test(phoneNumber)) {
      return res.send({
        sended: false,
        message: 'Phone number incorrect'
      });
    }

    let verificationCode = MiscService.randomInteger4().toString();

    client.messages.create({
      body: `Your code for Kora MVP - ${verificationCode}`,
      to: phoneNumber,
      from: fromNumber
    })
      .then((message) => {
        const text = 'SMS message with verification code was send';

        req.session.verificationCode = verificationCode;

        sails.log.info(`${text} to ${phoneNumber}. Massage sid: ${message.sid}`);

        return res.send({
          sended: true,
          message: text
        });
      })
      .catch(err => res.negotiate(err));
  },

  /**
   * `VerificationCodeController.confirm()`
   */
  confirm: function (req, res) {
    let verificationCode = req.param('verificationCode');

    if (!req.session.verificationCode) {
      return res.send({
        confirmed: false,
        message: 'Verification code was not send to you'
      });
    }

    if (verificationCode !== req.session.verificationCode) {
      return res.send({
        confirmed: false,
        message: 'Verification code incorrect'
      });
    }

    delete req.session.verificationCode;

    return res.send({
      confirmed: true,
      message: 'Verification code confirmed'
    });
  }
};
