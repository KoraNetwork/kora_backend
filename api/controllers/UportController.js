/**
 * UportController
 *
 * @description :: Server-side logic for managing uports
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const UportLite = require('uport-lite');
const registry = UportLite();

module.exports = {



  /**
   * `UportController.profile()`
   */
  profile: function (req, res) {
		registry('2orQh7p66g1T4Q8ZvjgEZN4uYH9SR4Vav8G', (err, profile) => {
			if (err) {
				return res.nogotiate(err);
			}

		  return res.json(profile);
		})
  }
};
