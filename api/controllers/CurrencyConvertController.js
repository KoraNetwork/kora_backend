/**
 * CurrencyConvertController
 *
 * @description :: Server-side logic for managing Currencyconverts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global User CurrencyConvert CurrencyConverterService ErrorService */

module.exports = {
  create: function (req, res) {
    const user = req.user;
    const from = req.user.id;
    const type = req.param('type');
    const to = req.param('to');
    const fromAmount = req.param('fromAmount');

    User.findOne({id: to})
      .then(toUser => {
        if (!toUser) {
          return Promise.reject(ErrorService.new({
            stutus: 404,
            message: 'To user not exists'
          }));
        }

        if (user.currency === toUser.currency) {
          return Promise.reject(ErrorService.new({
            stutus: 400,
            message: `Current user and 'to' user currencies must be not equal`
          }));
        }

        const currencyPair = user.currency + '_' + toUser.currency;

        return CurrencyConverterService.convert(currencyPair)
          .then(result =>
            CurrencyConvert.findOne({type, from, to})
              .then(record => {
                const exchangeRate = result[currencyPair];
                const toAmount = Math.round(exchangeRate * fromAmount * 100) / 100;

                if (!record) {
                  return CurrencyConvert.create({ type, from, to, exchangeRate, fromAmount, toAmount });
                }

                return CurrencyConvert.update({id: record.id}, { exchangeRate, fromAmount, toAmount })
                  .then(records => records[0]);
              })
          );
      })
      .then(result => res.ok(result))
      .catch(err => res.negotiate(err));
  }
};
