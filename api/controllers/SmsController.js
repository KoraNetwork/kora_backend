/**
 * SmsController
 *
 * @description :: Server-side logic for managing sms
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails ParserService TrialService MiscService */

const {accountSid, authToken, fromNumber} = sails.config.twilio;

const Twilio = require('twilio');
const client = new Twilio(accountSid, authToken);
const MessagingResponse = Twilio.twiml.MessagingResponse;

const validation = sails.config.validation;

module.exports = {

  /**
   * `SmsController.test()`
   */
  test: function (req, res) {
    client.messages.create({
      body: 'Hello from Kora MVP',
      to: '+380956641698', // Text this number
      from: fromNumber // From a valid Twilio number
    })
      .then((message) => {
        sails.log('SMS message was send: ', message.sid);

        return res.json({
          message: 'SMS message was send succesfully',
          // data: message,
          sid: message.sid
        });
      })
      .catch((err) => {
        return res.negotiate(err);
      });
  },

  /**
   * `SmsController.reply()`
   */
  reply: function (req, res) {
    var twiml = new MessagingResponse();
    twiml.message(ParserService.parse(TrialService.getMessage(req.body.Body), req.body.From));
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
  },

  /**
   * `SmsController.sendVerificationCode()`
   */
  sendVerificationCode: function (req, res) {
    let phoneNumber = req.param('phoneNumber');

    if (!validation.phoneNumber.test(phoneNumber)) {
      return res.badRequest('Phone number incorrect');
    }

    let verificationCode = MiscService.randomInteger6().toString();

    client.messages.create({
      body: verificationCode,
      to: phoneNumber,
      from: fromNumber
    })
      .then((message) => {
        const text = 'SMS message with verification code was send';

        req.session.verificationCode = verificationCode;

        sails.log.info(`${text}. Massage sid: ${message.sid}`);

        return res.ok(text);
      })
      .catch(err => res.negotiate(err));
  },

  /**
   * `SmsController.confirmVerificationCode()`
   */
  confirmVerificationCode: function (req, res) {
    let verificationCode = req.param('verificationCode');

    if (!req.session.verificationCode) {
      return res.badRequest('Verification code was not send to you');
    }

    if (verificationCode !== req.session.verificationCode) {
      return res.badRequest('Verification code incorrect');
    }

    delete req.session.verificationCode;

    return res.ok('Verification code confirmed');
  }
};
