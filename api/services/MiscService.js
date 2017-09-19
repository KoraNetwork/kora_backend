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

  /**
   * randomInteger function export
   */
  randomInteger,

  /**
   * Generates a random 6-digit integer
   * @return {Number} 6-digit integer
   */
  randomInteger6: function () {
    return randomInteger({min: 100000, max: 999999});
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
  }

};
