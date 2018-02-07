/**
 * User.js
 *
 * @description :: Kora Network user model.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/* global _ sails EthereumService ValidationService CountriesService ErrorService MailerService MiscService */

const bcrypt = require('bcrypt');

const roles = {
  // provider: 'provider',
  agent: 'agent',
  featurePhone: 'featurePhone',
  smartPhone: 'smartPhone'
};
const rolesList = _.values(roles);

module.exports = {
  constants: {
    roles,
    rolesList
  },

  attributes: {

    phone: { type: 'string', required: true, phoneNumber: true },

    userName: { type: 'string', required: true, alphanumericdashed: true },

    userNameOrigin: { type: 'string' },

    email: { type: 'string', email: true },

    emailVerificationToken: { type: 'string' },

    emailVerified: { type: 'boolean', defaultsTo: false },

    legalName: { type: 'string' },

    dateOfBirth: { type: 'string' }, // datetime: true

    currency: { type: 'string', in: CountriesService.currenciesList.map(el => el.currency) },

    countryCode: { type: 'string', in: CountriesService.list.map(el => el.countryCode) },

    ERC20Token: { type: 'string', ethereumAddress: true, in: CountriesService.currenciesList.map(el => el.ERC20Token) },

    postalCode: { type: 'string' },

    address: { type: 'string' },

    identity: { type: 'string', ethereumAddress: true },

    creator: { type: 'string', ethereumAddress: true },

    owner: { type: 'string', ethereumAddress: true },

    recoveryKey: { type: 'string', ethereumAddress: true },

    keystore: { type: 'json' },

    avatar: { type: 'string' },

    role: { type: 'string', in: rolesList, defaultsTo: roles.featurePhone },

    securityQuestion: { type: 'integer' },

    answerToSecurityQuestion: { type: 'string' },

    encryptedPassword: { type: 'string' },

    resetPasswordToken: { type: 'string', defaultsTo: '' },

    interestRate: { type: 'float', min: 0 },

    toJSON: function () {
      var obj = this.toObject();

      obj.userName = obj.userNameOrigin;
      delete obj.userNameOrigin;
      delete obj.encryptedPassword;
      delete obj.keystore;
      delete obj.resetPasswordToken;

      if (obj.countryCode) {
        obj.flag = CountriesService.flagImg(obj.countryCode);
      }

      if (obj.currency) {
        obj.currencyName = CountriesService.currenciesCollection[obj.currency].currencyName;
        obj.currencyNameFull = CountriesService.currenciesCollection[obj.currency].currencyNameFull;
      }

      obj.agent = obj.role === roles.agent;

      return obj;
    }
  },

  types: {
    phoneNumber: value => ValidationService.phoneNumber(value),
    ethereumAddress: value => ValidationService.ethereumAddress(value)
  },

  indexes: [
    {
      attributes: { phone: 1 },
      options: { unique: true }
    }, {
      attributes: { userName: 1 },
      options: { unique: true }
    }, {
      attributes: { email: 1 },
      options: {
        unique: true,
        partialFilterExpression: {email: {$exists: true}}
      }
    }, {
      attributes: { legalName: 1 }
    }
  ],

  beforeValidate: function (values, cb) {
    if (values.userName) {
      values.userNameOrigin = values.userName;
      values.userName = values.userName.toLowerCase();
    }

    if (values.email) {
      values.email = values.email.toLowerCase();
    }

    if (values.creator) {
      values.creator = values.creator.toLowerCase();
    }

    if (values.owner) {
      values.owner = values.owner.toLowerCase();
    }

    if (values.identity) {
      values.identity = values.identity.toLowerCase();
    }

    if (values.recoveryKey) {
      values.recoveryKey = values.recoveryKey.toLowerCase();
    }

    if (values.role === roles.agent && typeof values.interestRate === 'undefined') {
      values.interestRate = 5;
    }

    if (values.password) {
      if (!ValidationService.password(values.password)) {
        return cb(ErrorService.new({
          status: 400,
          message: 'Password must be over 8 characters, have at least 1 uppercase English letter, 1 lowercase English letter and 1 number'
        }));
      }

      return bcrypt.genSalt(10, function (err, salt) {
        if (err) {
          return cb(err);
        }

        bcrypt.hash(values.password, salt, function (err, hash) {
          if (err) {
            return cb(err);
          }

          values.encryptedPassword = hash;

          return cb();
        });
      });
    }

    return cb();
  },

  beforeCreate: function (values, cb) {
    let password = values.password;

    delete values.password;

    if (!password) {
      if (sails.config.environment === 'development') {
        // Password for development purposes
        password = 'qwer1234';
      } else {
        return cb(ErrorService.new({status: 400, message: 'Password must be set'}));
      }
    }

    values.emailVerificationToken = MiscService.generateRandomString(50);

    if (values.role === roles.featurePhone) {
      const {account, keystore} = EthereumService.createAccount({password});

      EthereumService.createIdentity({owner: account.address}, (err, { identity, creator, owner, recoveryKey }) => {
        if (err) {
          return cb(err);
        }

        Object.assign(values, {identity, creator, owner, recoveryKey, keystore});

        return cb();
      });
    } else {
      bcrypt.genSalt(10, function (err, salt) {
        if (err) {
          return cb(err);
        }

        bcrypt.hash(password, salt, function (err, hash) {
          if (err) {
            return cb(err);
          }

          values.encryptedPassword = hash;

          return cb();
        });
      });
    }
  },

  afterCreate: function (values, cb) {
    MailerService.sendConfirmationEmail(values);

    return cb();
  },

  beforeUpdate: function (valuesToUpdate, cb) {
    if (valuesToUpdate.email) {
      valuesToUpdate.emailVerified = false;
      valuesToUpdate.emailVerificationToken = MiscService.generateRandomString(50);
      MailerService.sendConfirmationEmail(valuesToUpdate);
    }

    return cb();
  },

  comparePassword: function (password, user, cb) {
    bcrypt.compare(password, user.encryptedPassword, function (err, match) {
      if (err) {
        return cb(err);
      }

      return cb(null, match);
    });
  },

  findOneUnique: function (identifier, cb) {
    this.findOne({or: [
      {phone: identifier},
      {userName: identifier.toLowerCase()},
      {email: identifier.toLowerCase()}
    ]})
      .then(user => cb(null, user))
      .catch(err => cb(err));
  }
};
