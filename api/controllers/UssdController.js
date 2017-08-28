/**
 * UssdController
 *
 * @description :: Server-side logic for managing ussds
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {



  /**
   * `UssdController.callback()`
   */
  callback: function (req, res) {
    var body = req.body || { data: 'No data was send' };
    var text = 'END Sent data: ' + JSON.stringify(body);

    return res.send(text);
  }
};

