/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails EthereumService */

module.exports = {
  testIdentity: function (req, res) {
    EthereumService.createIdentity({}, function (err, opts) {
      if (err) {
        return res.negotiate(err);
      }

      sails.log.info('Test identityMamager options:\n', opts);

      return res.json(opts);
    });
  }
};
