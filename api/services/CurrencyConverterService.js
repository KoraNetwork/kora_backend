/**
 * CurrencyConverterService
 * @description :: Converter of currencies
 */

/* global MiscService */

const request = require('request-promise-native');

const API = {
  url: 'http://free.currencyconverterapi.com/api/v5/convert',
  compact: 'ultra'
};

module.exports = {
  convert: function (currencyPair = 'USD_EUR', cb) {
    let promise = request({
      uri: API.url,
      qs: {q: currencyPair, compact: API.compact},
      method: 'GET'
    })
      .then(body => {
        try {
          var parsedBody = JSON.parse(body);
        } catch (e) {
          return Promise.reject(e);
        }

        return parsedBody;
      });

    return MiscService.cbify(promise, cb);
  }
};
