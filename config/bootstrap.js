/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.bootstrap.html
 */

/* global sails JobsService MiscService */

const scheduler = require('node-schedule');

module.exports.bootstrap = function (cb) {
  if (
    // Run job in development environment
    process.env.NODE_ENV === 'development' ||
    // Run job only on first/main AWS instance
    MiscService.getLocalExternalIp() === sails.config.mainIP
    // // Run job only for one instance of PM2
    // process.env.NODE_APP_INSTANCE == 0 // eslint-disable-line eqeqeq
  ) {
    // scheduler.scheduleJob('*/42 * * * * *', function () {
    //   sails.log.info(new Date().toISOString(), '- The answer to life, the universe, and everything!');
    // });

    scheduler.scheduleJob('20 0 * * * *', JobsService.closeLoans);
  }

  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  cb();
};
