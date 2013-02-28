/*
 * Handles "/"" index request
 */

/**
 * Local dependencies
 */

var database = require('../controllers/database')
  , helper = require('../controllers/helper');

/**
 * Middleware to figure out if lifegraph app is configured. 
 * If not, this needs to be set up first before anything will run. (dev environment with clean databse, db gets nuked, etc)
 */
exports.lifeGraphSetUpMiddleWare = function (req, res, next) {
  database.getApiConfig(req.app.get('fbapp'), function(err, item) {
    if (err || !item) {
      // OH SHIIII
      // we don't have the needed production or development app set up
      // which means we would go into a spin of awful infinite redirects
      res.redirect('/' + req.app.get('fbapp') + '/admin');
    } else {
      next();
    }
  });
}


/*
 * GET /
 */
 
exports.index = function (req, res) {
  database.getUserDevices(helper.getSessionId(req), function (err, devices) {
    database.getApps(req, function (err, apis) {
      var lifegraphConnected = false, lgtokens;
      apis = apis.filter(function(app) {
        if (app.namespace == req.app.get('fbapp')) { // check for the app running this connect server
          lifegraphConnected = true;
          lgtokens = app.tokens;
          return false;
        }
        return true;
      });

      // Now get the name if we can.
      helper.getUser(req, lgtokens, function(err, fbuser) {
        res.render('index', {
          title: 'Lifegraph Connect',
          apps: apis || [],
          devices: (helper.getSessionId(req) && devices) || [],
          lifegraphConnected: lifegraphConnected,
          lifegraphNamespace: req.app.get('fbapp'),
          fbid: helper.getSessionId(req),
          fbuser: fbuser
        });
      });
    });
  });
}

/*
 * GET /logout
 * logs out of lifegraph connect
 */

exports.logout = function (req, res) {
  database.getAuthTokens(req.app.get('fbapp'), helper.getSessionId(req), function (err, lgtokens) {
    if (lgtokens) {
      var access_token = lgtokens.tokens.oauthAccessToken;
      var fbLogoutUri = 'https://www.facebook.com/logout.php?next=http://' + req.app.get('host') + '/' + req.app.get('fbapp') + '/logout' +'/&access_token=' + access_token;
      helper.removeSessionId(req);
      res.redirect(fbLogoutUri);
    } else {
      res.redirect('/');
    }
  });
}