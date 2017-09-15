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
        result = "Please enter contact\n OR select:\n 2, 3, 4, 5: List\nfavorite/recent\ncontacts";
        break;
      }
      default: {
        if(ParserService.isNumber(message)){
          result = "Please enter amount"
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
