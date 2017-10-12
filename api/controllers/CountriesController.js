/**
 * CountriesController
 *
 * @description :: Server-side logic for managing countries
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global CountriesService */

module.exports = {
  /**
   * `CountriesController.index()`
   */
  index: function (req, res) {
    return res.json(CountriesService.list);
  },

  collection: function (req, res) {
    return res.json(CountriesService.collection);
  }
};
