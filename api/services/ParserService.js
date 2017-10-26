// api/services/ParserService.js

var dateFormat = require('dateformat');

var securityQuestions = [
  'Mymother\'smaiden name',
  'My first pet\'sname',
  'My favourite book',
  'My favorite singer'
];

var messages = {
  menu: "1: Check Balance 2: Deposit/Withdraw 3: Send Money 4: Request Money 5: Lend/Borrow",
  register: 'Please sign up a user name (User name need to start with a letter)',
  sendMoney: 'Please enter contact OR select: 2, 3, 4, 5: List favorite/recent contacts',
  requestMoney: 'Please enter contact OR select: 2, 3, 4, 5: List favorite/recent contacts',
  securityQuestions: () => {
    let result = 'Please select the following questionsassecurity question: ';
    for (let i = 0; i < securityQuestions.length; i++) {
      result += `${ (i + 1) }: ${ securityQuestions[i] } `;
    }
    return result;
  },
  profile: (session) => {
    let result = 'You almost finished setting up your account.';
    result += `Account number `;
    result += `User Name: ${ session.userName } `;
    result += `SecurityQuestion: ${ securityQuestions[session.securityQuestion] } `;
    result += `Answer to SecurityQuestion: ${ session.answer } `;
    result += `Your birthdate: ${ session.strDate } `;
    result += 'Please confirmby replyingwith your PIN, or reply "DENY" to deny';
    return result;
  }
}

module.exports = {
  parse: function ({message, phoneNumber, session, user}, cb) {
    switch (message) {
      case 'menu': {
        result = messages.menu;
        init(session, 'menu');
        break;
      }

      case 'register': {
        result = messages.register;
        init(session, 'register');
        break;
      }

      case '1': {
        result = `Please confirm you want to check balance on ${ dateFormat(new Date(), 'dd/mm/yyyy') } by enteringyour PIN.`;
        init(session, 'checkBalance');
        break;
      }

      case '2': {
        init(session, 'deposit');
        break;
      }

      case '3': {
        result = messages.sendMoney;
        init(session, 'sendMoney');
        break;
      }

      case '4': {
        result = messages.requestMoney;
        init(session, 'requestMoney');
        break;
      }

      case 'count': {
        const smsCount = session.counter || 0;

        result = 'Hello, thanks for the new message.';

        if (smsCount > 0) {
          result = 'Hello, thanks for message number ' + (smsCount + 1);
        }

        session.counter = smsCount + 1;

        break;
      }

      default: {

        switch (session.action) {
          case 'menu': {

            break;
          }

          case 'register': {
            switch (session.step) {
              case 0: {
                if (isLetter(message)) {
                  session.userName = message;
                  nextStep(session);
                  result = 'User name is valid. Please set up a password for your account.';
                } else {
                  result = 'User name is invalid. Please sign up a user name (User name need to start with a letter)'
                  checkAttemptCount(this, session);
                }
                break;
              }

              case 1: {
                session.password = message;
                nextStep(session);
                result = 'Password isqualified. Please enter your birth date.';
                break;
              }

              case 2: {
                session.date = message;
                result = messages.securityQuestions();
                nextStep(session);
                break;
              }

              case 3: {
                let n = parseInt(message.substr(1));
                if (n >= 1 && n <= 4) {
                  session.securityQuestion = n;
                  nextStep(session);
                  result = `You have chosen "${ securityQuestions[n - 1] }" asyour security question. Please replywith the answer or reply "0" to rechoose the security questions.`;
                } else {
                  result = `Please select security question ([1..${ securityQuestions.length }])`;
                  checkAttemptCount(this, session);
                }
                break;
              }

              case 4: {
                if (message.length >= 1 && message[0] === '0') {
                  --session.step;
                  session.attempt = 0;
                  result = messages.securityQuestions();
                } else {
                  session.answer = message;
                  session.phone = phoneNumber;
                  nextStep(session);
                  result = messages.profile(session);
                  break;
                }
              }

              case 5: {
                if (message.toLowerCase() === 'deny') {
                  init(session, 'menu');
                } else if (message === session.password) {
                  result = 'You have now set up your account. If youwant to keep authenticating your account pleasereply with "authentication" or you are your set.';
                  return User.create({
                    phone: session.phone,
                    userName: session.userName,
                    dateOfBirth: session.date,
                    password: session.password,
                    securityQuestion: session.securityQuestion,
                    answerToSecurityQuestion: session.answer
                  }).exec(function (err, user) {
                    if (err) {
                      console.error(err);
                      cb(err)
                    } else {
                      init(session, 'menu');
                      cb(null, result);
                    }
                  })
                } else {
                  result = 'PIN do not match. Please try again.'
                  checkAttemptCount(this, session);
                }
              }
            }
            break;
          }

          case 'checkBalance': {
            switch (session.step) {
              case 0: {
                return User.comparePassword(password, user, (err, valid) => {
                  if (err) {
                    checkAttemptCount(this, session);
                    cb(err);
                  } else {
                    if (valid) {
                      TokensService.balanceOf({address: user.identity}, (err, result) => {
                        cb(err, !err ? `${ dateFormat(new Date(), 'dd/mm/yyyy') } eNaira: ${ result }.` : null);
                      });
                    } else {
                      cb(null, 'Wrong PIN. Please try again.')
                    }
                  }
                })
              }
            }
            break;
          }

          case 'deposit': {

            break;
          }

          case 'sendMoney': {

            break;
          }

          case 'requestMoney': {

            break;
          }

          default: {
            result = 'Error!'
          }
        }

        // if (isNumber(message)) {
        //   result = 'Please enter amount (format: $xxx)';
        // } else if (message[0] === '$' && parseInt(message.substr(1)).toString() === message.substr(1)) {
        //   result = 'Please confirm you want to request ' + message + ' from 555-555-5555 by entering your PIN.';
        // } else {
        //   result = 'Kora MVP are coming! Head for the hills!';
        // }
      }
    }
    return cb(null, result);
  },

  init,
  isLetter,
  isNumber,
  nextStep,
  checkAttemptCount
};

function isNumber (str) {
  var arr = str.split('-');

  if (arr.length !== 3) {
    return false;
  }

  for (var i = 0; i < arr.length; i++) {
    if (parseInt(arr[i]).toString() !== arr[i]) {
      return false;
    }
  }

  return true;
}

function init (session, action) {
  if (session) {
    session.action = action;
    session.step = 0;
    session.attempt = 0;
  }
}

function isLetter (str) {
  return str[0].toLowerCase() != str[0].toUpperCase();
}

function nextStep (session) {
  if (session) {
    ++session.step;
    session.attempt = 0;
  }
}

function checkAttemptCount (scope, session){
  ++session.attempt;
  if (session.attempt >= 2) {
    scope.result = 'Ended the number of attempts, please try again.';
    init(session, 'menu');
  }
}
