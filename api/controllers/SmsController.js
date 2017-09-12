/**
 * SmsController
 *
 * @description :: Server-side logic for managing sms
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

 var accountSid = 'AC93c494dcc34b88d2e6e1b6b2411bc0a1'; // Your Account SID from www.twilio.com/console
 var authToken = '8d7c804369655c43a73b842d8808bec4';   // Your Auth Token from www.twilio.com/console

 var twilio = require('twilio');
 var client = new twilio(accountSid, authToken);
 var MessagingResponse = twilio.twiml.MessagingResponse;


module.exports = {

  /**
   * `SmsController.test()`
   */
  test: function (req, res) {
		client.messages.create({
		    body: 'Hello from Kora MVP',
		    to: '+380956641698',  // Text this number
		    from: '+14159361767' // From a valid Twilio number
		})
		.then((message) => {
			sails.log('SMS message was send: ', message.sid);

			return res.json({
				message: 'SMS message was send succesfully',
				// data: message,
				sid: message.sid,
			})
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
    twiml.message(ParserService.parse(TrialService.getMessage(req.body.Body)));
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
  }
};
