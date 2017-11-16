/**
 * DepositController
 *
 * @description :: Server-side logic for managing deposits
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  /**
   * `DepositController.find()`
   */
  index: function (req, res) {
    return res.json({
      data: [],
      total: 0
    });
  }
};
