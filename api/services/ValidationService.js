/**
 * ValidationService
 * @description :: Set of validation functions
 */

module.exports = {
  phoneNumber: value => /^[1-9]\d{9,11}$/i.test(value)
};
