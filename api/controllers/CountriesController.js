/**
 * CountriesController
 *
 * @description :: Server-side logic for managing countries
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const worldCountries = require('world-countries');
const countriesFilter = [
  'CA',
  'NG',
  'UA',
  'UG',
  'US'
];

const parsedCountries = worldCountries
  .filter(el => ~countriesFilter.indexOf(el.cca2))
  .map(({name: {common: name}, currency: [currency], callingCode: [callingCode], cca3}) => ({
    name,
    currency,
    phoneCode: `+${callingCode}`,
    flag: `/countries/${cca3.toLowerCase()}.svg`
  }));

module.exports = {
  /**
   * `CountriesController.index()`
   */
  index: function (req, res) {
    return res.json(parsedCountries);
  }
};
