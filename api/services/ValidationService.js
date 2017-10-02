/**
 * ValidationService
 * @description :: Set of validation functions
 */

const Web3 = require('web3');

module.exports = {
  phoneNumber: value => /^[1-9]\d{9,11}$/i.test(value),

  address: value => Web3.utils.isAddress(value)
};
