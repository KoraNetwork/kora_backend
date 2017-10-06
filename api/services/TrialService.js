// api/services/TrialService.js

var trialString = 'Sent from your Twilio trial account';

module.exports = {
  getMessage: function (str) {
    if (str.indexOf(trialString) > -1) return str.substr(trialString.length + 3);
    else return str;
  }
};
