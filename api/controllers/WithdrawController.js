/**
 * WithdrawController
 *
 * @description :: Server-side logic for managing withdraws
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  /**
   * `WithdrawController.find()`
   */
  index: function (req, res) {
    return res.json({
      data: [],
      total: 0
    });
  }
};
