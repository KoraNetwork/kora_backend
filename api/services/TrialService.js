// api/services/TrialService.js

var trial_string = "Sent from your Twilio trial account";

module.exports = {
  getMessage: function(str) {
    if(str.indexOf(trial_string) > -1) return str.substr(trial_string.length + 3)
    else return str;
  }
};
