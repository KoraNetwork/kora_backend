/**
 * CountriesService
 *
 * @description :: Countries with currencies and ERC20Tokens list generator
 */

/* global sails */
const worldCountries = require('world-countries');
const worldCurrencies = require('world-currencies');
const {ERC20Tokens} = sails.config.countries;

const flagImg = cca2 => `/images/flags/${cca2}.png`;

const list = worldCountries
  // .filter(el => ~Object.keys(ERC20Tokens).indexOf(el.cca2))
  .filter(el => el.callingCode.length)
  .map(({name: {common: name}, currency: [currency], callingCode: [callingCode], cca2}) => {
    // const {name: currencyNameFull, units: {major: {name: currencyName}}} = worldCurrencies[currency];
    const worldCurrencie = worldCurrencies[currency];
    const currencyName = worldCurrencie && worldCurrencie.units.major.name;
    const currencyNameFull = worldCurrencie && worldCurrencie.name;

    return {
      countryCode: cca2,
      name,
      currency,
      currencyName: currencyName && currencyName[0].toUpperCase() + currencyName.slice(1),
      currencyNameFull,
      ERC20Token: ERC20Tokens[currency],
      phoneCode: `+${callingCode}`,
      flag: flagImg(cca2)
      // currencyFlag: flagImg(currency.slice(0, 2))
    };
  });

const collection = list.reduce((result, current) => {
  result[current.countryCode] = current;
  return result;
}, {});

const currenciesList = Object.keys(ERC20Tokens)
  .map(currency => {
    const {name: currencyNameFull, units: {major: {name: currencyName}}} = worldCurrencies[currency];

    return {
      currency,
      currencyName: currencyName[0].toUpperCase() + currencyName.slice(1),
      currencyNameFull,
      ERC20Token: ERC20Tokens[currency],
      flag: flagImg(currency.slice(0, 2))
    };
  });
// const currenciesList = list.filter(c => c.ERC20Token)
//   .map(c => Object.assign({}, c, {flag: flagImg(c.currency.slice(0, 2))}));

const currenciesCollection = currenciesList.reduce((result, current) => {
  result[current.currency] = current;
  return result;
}, {});

module.exports = {
  list,
  collection,
  currenciesList,
  currenciesCollection,
  flagImg
};
