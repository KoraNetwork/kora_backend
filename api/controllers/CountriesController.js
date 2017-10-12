/**
 * CountriesController
 *
 * @description :: Server-side logic for managing countries
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global sails */
const worldCountries = require('world-countries');
const {ERC20Tokens} = sails.config.countries;

const parsedCountries = worldCountries
  .filter(el => ~Object.keys(ERC20Tokens).indexOf(el.cca2))
  .map(({name: {common: name}, currency: [currency], callingCode: [callingCode], cca2}) => ({
    name,
    countryCode: cca2,
    currency,
    ERC20Token: ERC20Tokens[cca2],
    phoneCode: `+${callingCode}`,
    flag: `/images/flags/${cca2}.png`
  }));

module.exports = {
  /**
   * `CountriesController.index()`
   */
  index: function (req, res) {
    return res.json(parsedCountries);
  }
};
