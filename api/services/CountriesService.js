/**
 * CountriesService
 *
 * @description :: Countries with currencies and ERC20Tokens list generator
 */

/* global sails */
const worldCountries = require('world-countries');
const {ERC20Tokens} = sails.config.countries;

const flagImg = cca2 => `/images/flags/${cca2}.png`;

const list = worldCountries
  .filter(el => ~Object.keys(ERC20Tokens).indexOf(el.cca2))
  .map(({name: {common: name}, currency: [currency], callingCode: [callingCode], cca2}) => ({
    countryCode: cca2,
    name,
    currency,
    ERC20Token: ERC20Tokens[cca2],
    phoneCode: `+${callingCode}`,
    flag: flagImg(cca2)
  }));

const collection = list.reduce((result, current) => {
  result[current.countryCode] = current;
  return result;
}, {});

module.exports = {
  list,
  collection,
  flagImg
};
