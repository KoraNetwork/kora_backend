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
  }
};
