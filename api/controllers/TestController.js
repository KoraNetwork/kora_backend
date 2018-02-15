/**
 * TestController
 *
 * @description :: Server-side logic for managing tests
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global User ParserService CurrencyConverterService Borrow */

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

  sms: function (req, res) {
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
        });
      } else {
        return res.send({
          message: 'Please sign up before.'
        });
      }
    });
  },

  convert: function (req, res) {
    const q = req.param('q');

    CurrencyConverterService.convert(q, (err, result) => {
      if (err) {
        return res.serverError(err);
      }

      return res.ok(result);
    });
  },

  closeLoans: function (req, res) {
    const {states, types} = Borrow.constants;
    const now = new Date();

    return Promise.all([
      Borrow.find({
        startDate: {'<=': now},
        type: types.request,
        state: [states.onGoing, states.agreed]
      }, {
        state: states.expired
      }),
      Borrow.find({
        startDate: {'<=': now},
        type: types.loan,
        state: [states.onGoing, states.agreed]
      }),
      Borrow.find({
        maturityDate: {'<': now},
        type: types.inProgress,
        state: states.onGoing
      })
    ])
      .then(([expiredRequests, expiredLoans, overdueLoans]) => ({expiredRequests, expiredLoans, overdueLoans}))
      .then(r => res.ok(r))
      .catch(err => res.negotiate(err));
  }
};
