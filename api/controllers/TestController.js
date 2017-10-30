/**
 * TestController
 *
 * @description :: Server-side logic for managing tests
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  test: function (req, res) {
    let testParameter = req.param('test_parameter');

    if (testParameter === '123') {
      return res.send({
        message: 'Test message'
      });
    }

    return res.send(404, {
      'error': 'Not found!'
    });
  },

  sms: function (req, res){
    User.findOne({ phone: req.param('number') }, (err, user) => {

      if (err) {
        return res.negotiate(err);
      }

      if (user || req.param('sms') === 'register' ||
        (req.session.action === 'register' &&
        ['menu', '1', '2', '3', '4'].indexOf(req.param('sms')) === -1)) {
        ParserService.parse({
          message: req.param('sms'),
          phoneNumber: req.param('number'),
          session: req.session,
          user: user
        }, (err, message) => {
          return res.send({
            message: err || message
          });
        })
      } else {
        return res.send({
          message: 'Please sign up before.'
        })
      }
    })
  },
};
