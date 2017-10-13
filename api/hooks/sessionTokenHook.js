/**
 * fetchUserHook
 * @description :: Adds token and user to req if there are Session-Token
 * @return {[type]}       [description]
 */

/* global User JWTokenService */

module.exports = function sessionTokenHook (sails) {
  return {
    // Add some routes to the app.
    routes: {

      // Add these routes _before_ anything defined in `config/routes.js`.
      before: {

        // Add a route that will match everything (using skipAssets to...skip assets!)
        '/*': {
          fn: function (req, res, next) {
            let token;

            if (req.headers && req.headers['session-token']) {
              token = req.headers['session-token'];
            } else if (req.param('sessionToken')) {
              token = req.param('sessionToken');
              // We delete the token from param to not mess with blueprints
              delete req.query.sessionToken;
            } else {
              return next();
            }

            JWTokenService.verify(token, function (err, decoded) {
              // decoded is the decrypted token or the payload you provided

              if (err) {
                return res.json(401, {message: 'Invalid Session-Token!'});
              }

              User.findOne({id: decoded.id}).exec(function (err, user) {
                if (err) {
                  return res.serverError(err);
                }

                if (!user) {
                  return res.json(401, {message: 'Could not find user in session!'});
                }

                req.user = user;

                // TODO: Add session store logic for JWTokens

                return next();
              });
            });
          },

          skipAssets: true
        }
      }
    }
  };
};
