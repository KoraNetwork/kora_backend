/**
 * SmsController
 *
 * @description :: Server-side logic for managing sms
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails ParserService TrialService */

const {accountSid, authToken, fromNumber} = sails.config.twilio;

const Twilio = require('twilio');
const client = new Twilio(accountSid, authToken);
const MessagingResponse = Twilio.twiml.MessagingResponse;

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
    User.findOne({ phone: req.param('number') }, (err, user) => {

      if (user || req.session.action === 'register' ||
        TrialService.getMessage(req.body.Body) === 'register') {
        twiml.message(ParserService.parse({
          message: TrialService.getMessage(req.body.Body),
          phoneNumber: req.body.From,
          session: req.session
        }));
      } else {
        rtwiml.message('Please sign up before.');
      }
    })

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
  }
};
