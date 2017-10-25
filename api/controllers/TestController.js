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

      if (user || req.session.action === 'register' || req.param('sms') === 'register') {
        ParserService.parse({
          message: req.param('sms'),
          phoneNumber: req.param('number'),
          session: req.session
        }, (err, message) => {
          return res.send({
            message: err || result
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
