/*
 * Routes for /:fbapp/* stuff
 */

/**
 * Module dependencies
 */
var rem = require('rem');

/**
 * Local dependencies
 */
var database = require('../controllers/database')
  , helper = require('../controllers/helper');


/**
 * Middleware for the admin pages of apps.
 */

exports.adminMiddleware = function (req, res, next) {
  database.getApiConfig(req.app.get('fbapp'), function (err, lgconfig) {
    database.getAuthTokens(req.app.get('fbapp'), helper.getSessionId(req), function (err, lgtokens) {
      if (err || !lgtokens) {
        console.log("REDIRECTING 1");
        console.log(err);
        console.log(lgtokens);
        // OH SHIIII
        // we don't have the needed production (lifegraph) or development (lifegraph-local) app set up
        // which means we would go into a spin of awful infinite redirects back to the homepage
        // F it, just let them edit it in that case if they are trying to get to the app that runs this site
        if (req.params.fbapp == req.app.get('fbapp')) {
          return next();
        } else {
          return res.redirect('/');
        }
      }

      // Create Facebook client.
      var fb = rem.connect('facebook.com', '*').configure({
        key: lgconfig.api_key,
        secret: lgconfig.secret_key
      });

      // Start oauth login.
      var oauth = rem.oauth(fb, 'http://' + req.app.get('host') + '/' + req.params.fbapp + '/oauth/callback');
      var user = oauth.restore(lgtokens.tokens);

      user.validate(function (flag) {
        if (!flag) {
          console.log("REDIRECTING 2");
          console.log(flag);
          return res.redirect('/' + req.app.get('fbapp') + '/login');
        }

        console.log(lgtokens.tokens);

        user('me/applications/developer/').get(function (err, json) {
           if (json.data.some(function(app) { return app.namespace == req.params.fbapp})) {
            next();
          } else {
            res.json({error: 'Not your app'}, 401);
          }
        });
      });
    });
  });
}
/*
 * GET /:fbapp/admin
 *
 * Administration for each fb app.
 */


exports.admin = function (req, res) {
  database.getApiConfig(req.params.fbapp, function (err, apiconfig) {
    res.render('admin', {
      namespace: req.params.fbapp,
      apiconfig: apiconfig || {},
      fbusers: []
    });
  });
}

/*
 * POST /:fbapp/admin
 *
 * Handles form post from admin.
 */

exports.adminPost = function (req, res) {
  console.log(req.body);
  var props = {
    'permissions': req.body.scope,
    'callback_url': req.body.callbackurl,
    'name': req.body.name,
    'description': req.body.description,
    "image": req.body.image
  }
  if (req.body.apikey && req.body.secretkey) {
    props.api_key = req.body.apikey;
    props.secret_key = req.body.secretkey;
  }
  database.setApiConfig(req.params.fbapp, props, function () {
    res.redirect('/' + req.params.fbapp + '/admin');
  });
};

/*
 * GET /:fbapp/login
 *
 * Login endpint to start fb app auth.
 */

exports.login = function (req, res) {
  database.getApiConfig(req.params.fbapp, function (err, config) {
    if (!config) {
      return res.send('No app found.', 404);
    }

    // Create Facebook client.
    var fb = rem.connect('facebook.com', '*').configure({
      key: config.api_key,
      secret: config.secret_key
    });

    // Start oauth login.
    var oauth = rem.oauth(fb, 'http://' + req.app.get('host') + '/' + req.params.fbapp + '/oauth/callback');
    oauth.start({
      scope: config.permissions
    }, function (url) {
      res.redirect(url);
    });
  });
};

/*
 * GET /:fbapp/oauth/callback
 *
 * FB callback for oauth for this specific fbapp.
 */

exports.callback = function (req, res) {
  database.getApiConfig(req.params.fbapp, function (err, keys) {
    // Create Facebook client.
    var fb = rem.connect('facebook.com', '*').configure({
      key: keys.api_key,
      secret: keys.secret_key
    });

    // Start and complete oauth.
    var oauth = rem.oauth(fb, 'http://' + req.app.get('host') + '/' + req.params.fbapp + '/oauth/callback');
    oauth.start({
      scope: keys.permissions
    }, function (url) {
      oauth.complete(req.url, function (err, user) {
        if (err) {
          res.send('Invalid login credentials or invalid app configuration.');
        } else {
          // Get basic info.
          user('me').get(function (err, json) {
            if (err) {
              res.send('Could not retrieve user information.');
            } else {
              user.saveState(function (state) {
                database.storeAuthTokens(req.params.fbapp, json.id, state, function () {
                  helper.setSessionId(req, json.id);
                  res.redirect('/');
                });
              })
            }
          })
        }
      });
    });
  });
};

/*
 * GET /:fbapp/revoke
 *
 * Lets the user revoke access of the app.
 */

exports.revokeAccess = function (req, res) {
  database.deleteAuthTokens(req.params.fbapp, helper.getSessionId(req), function () {
    res.redirect('/');
  });
}
