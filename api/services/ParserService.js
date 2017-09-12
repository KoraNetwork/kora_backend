// api/services/ParserService.js

module.exports = {
  parse: function(message){
    var result = ''
    switch (message) {
      case "menu": {
        result = "1: Check Balance\n2: Deposit/Withdraw\n3: Send Money\n4: Request Money\n5: Lend/Borrow";
        break;
      }
      default: {
        result = "Kora MVP are coming! Head for the hills!"
      }
    }
    return result;
  }
};
