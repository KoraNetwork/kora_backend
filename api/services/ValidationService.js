/**
 * ValidationService
 * @description :: Set of validation functions
 */

const Web3Utils = require('web3-utils');

module.exports = {
  phoneNumber: value => /^[1-9]\d{7,12}$/i.test(value),

  ethereumAddress: value => Web3Utils.isAddress(value),

  password: value => /^(?=.*\d)(?=.*[a-zA-Z]).{8,}$/.test(value),

  hex: value => Web3Utils.isHex(value)
};
