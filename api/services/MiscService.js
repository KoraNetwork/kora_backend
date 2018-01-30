/**
 * MiscService
 * @description :: Set of misc functions
 */

/**
 * Generates a random integer between min and max, including min, max as possible values
 * @param  {Number} min Min value
 * @param  {Number} max Max vaue
 * @return {Number}     Random integer
 */
function randomInteger ({min, max}) {
  var rand = min + Math.random() * (max + 1 - min);
  rand = Math.floor(rand);
  return rand;
}

module.exports = {

  cbify: function (promise, cb) {
    if (cb && typeof cb === 'function') {
      promise.then(cb.bind(null, null), cb);
    }

    return promise;
  },

  /**
   * randomInteger function export
   */
  randomInteger,

  /**
   * Generates a random 4-digit integer
   * @return {Number} 4-digit integer
   */
  randomInteger4: function () {
    return randomInteger({min: 1000, max: 9999});
  },

  /**
   * Generates a random n-digit integer
   * @param  {Number} n Number of digits
   * @return {Number}   n-digit number
   */
  randomIntegerN: function (n) {
    let min = Math.pow(10, n - 1);
    let max = Math.pow(10, n) - 1;

    return randomInteger({min, max});
  },

  calcTotalAmount: function (amount, interestRate) {
    return Math.floor(amount * (100 + interestRate)) / 100;
  }
};
