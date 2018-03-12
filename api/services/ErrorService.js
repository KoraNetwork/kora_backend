/**
 * ErrorService
 * @description :: Error handlers
 */
const WLError = require('waterline/lib/waterline/error/WLError');

var util = require('util');
var http = require('http');

function HttpError (status, message) {
  this.status = status;
  this.message = message || http.STATUS_CODES[status] || 'Something went wrong';
  Error.captureStackTrace(this, HttpError);
}

util.inherits(HttpError, Error);
HttpError.prototype.name = 'HttpError';

module.exports = {
  HttpError,

  WLError,

  new: function ({status = 500, message}) {
    return new WLError({status, message});
  }
};
