/**
 * BorrowController
 *
 * @description :: Server-side logic for managing borrows
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global Borrow */

module.exports = {
  create: function (req, res) {
    let allParams = req.allParams();

    allParams.from = req.user.id;
    allParams.fromAmount = parseFloat(allParams.fromAmount, 10);
    allParams.toAmount = parseFloat(allParams.toAmount, 10);
    allParams.rate = parseFloat(allParams.rate, 10);

    Borrow.create(allParams)
      .then(({id}) => Borrow.findOne({id})
        .populate('from')
        .populate('to')
        .populate('guarantors')
      )
      .then(result => {
        result.direction = Borrow.constants.directions.from;
        return res.ok(result);
      })
      .catch(err => res.negotiate(err));
  }
};
