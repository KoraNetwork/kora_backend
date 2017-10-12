/**
 * isAuthorized
 *
 * @description :: Policy to check if user is authorized with JSON web token
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Policies
 */

/* global JWTokenService User */

module.exports = function (req, res, next) {
  var token;

  if (req.headers && req.headers['session-token']) {
    token = req.headers['session-token'];
  } else if (req.param('sessionToken')) {
    token = req.param('sessionToken');
    // We delete the token from param to not mess with blueprints
    delete req.query.sessionToken;
  } else {
    return res.json(401, {message: 'No Session-Token header was found'});
  }

  JWTokenService.verify(token, function (err, token) {
    if (err) {
      return res.json(401, {message: 'Invalid Session-Token!'});
    }

    req.token = token; // This is the decrypted token or the payload you provided

    let userId = token.id;

    if (!userId) {
      return next();
    }

    User.findOne({id: userId}).exec(function (err, user) {
      if (err) {
        return res.serverError(err);
      }

      if (!user) {
        return res.serverError(new Error('Could not find user in session!'));
      }

      req.user = user;

      return next();
    });
  });
};
