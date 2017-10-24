/**
 * ValidationService
 * @description :: Set of validation functions
 */

const Web3Utils = require('web3-utils');

module.exports = {
  phoneNumber: value => /^[1-9]\d{9,12}$/i.test(value),

  address: value => Web3Utils.isAddress(value),

  hex: value => Web3Utils.isHex(value)
};
