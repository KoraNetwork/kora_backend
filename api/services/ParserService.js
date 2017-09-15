// api/services/ParserService.js

module.exports = {
  parse: function(message, phone_number){
    var result = '';

    switch (message) {
      case "menu": {
        result = "1: Check Balance\n2: Deposit/Withdraw\n3: Send Money\n4: Request Money\n5: Lend/Borrow";
        break;
      }
      case "3": {

      }
      case "4": {
        result = "Please enter contact\n OR select:\n 2, 3, 4, 5: List\nfavorite/recent\ncontacts";
        break;
      }
      default: {
        if(isNumber(message)){
          result = "Please enter amount (format: $xxx)"
        }
        else if(message[0] == '$' && parseInt(message.substr(1)).toString() == message.substr(1)){
          result = "Please confirm you want to request " + message + " from 555-555-5555 by entering your PIN.";
        }
        else{
          result = "Kora MVP are coming! Head for the hills!"
        }
      }
    }
    return result;
  },

  isNumber: function(str){
    var arr = str.split('-');
    if(arr.length != 3) return false;
    for(var i = 0; i < arr.length; i++){
      if(parseInt(arr[i]).toString() != arr[i]){
        return false;
      }
    }
    return true;
  }
};
