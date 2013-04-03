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
 * GET /:fbapp
 *
 * Endpoint to get connected on your phone.
 */

exports.fbapp = function(req, res) {
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
    var oauth = rem.oauth(fb, 'http://' + req.app.get('host') + '/' + req.params.fbapp + '/oauth/callback/fbapp');
    oauth.start({
      scope: config.permissions
    }, function (url) {
      res.redirect(url);
    });
  });
}

/*
 * GET /:fbapp/oauth/callback/fbapp
 *
 * FB callback for oauth for this specific fbapp when doing mobile device, app-specific syncing (went to /:fbapp)
 */

exports.fbappcallback = function (req, res) {
  console.log("HIT App CALLBACK for", req.params.fbapp);
  database.getApiConfig(req.params.fbapp, function (err, apiConfig) {
    // Create Facebook client.
    var fb = rem.connect('facebook.com', '*').configure({
      secret: apiConfig.secret_key,
      key: apiConfig.api_key,
    });

    // Start and complete oauth.
    var oauth = rem.oauth(fb, 'http://' + req.app.get('host') + '/' + req.params.fbapp + '/oauth/callback/fbapp');
    oauth.start({
      scope: apiConfig.permissions
    }, function (url) {
      oauth.complete(req.url, function (err, user) {
        if (err) {
          res.json({message: 'Invalid login credentials or invalid app configuration.', err:err});
        } else {
          // Get basic info.
          user('me').get(function (err, json) {
            if (err) {
              res.send('Could not retrieve user information.');
            } else {
              user.saveState(function (state) {
                database.storeAuthTokens(req.params.fbapp, json.id, state, function () {
                  helper.setSessionId(req, json.id);
                  database.getUserDevices(json.id, function (err, devices) {
                    if (!err && devices && devices.length) { // we have devices already
                      res.redirect('/');
                    } else {
                      res.redirect('/');
                    }
                  });
                });
              });
            }
          });
        }
      });
    });
  });
};

/*
 * GET /:fbapp/sync/:pid
 *
 * Endpint to redirect people to to authenticate with this app.
 */

exports.sync = function (req, res) {
  req.session.pid = req.params.pid;
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
    var oauth = rem.oauth(fb, 'http://' + req.app.get('host') + '/' + req.params.fbapp + '/oauth/callback/physical');
    oauth.start({
      scope: config.permissions
    }, function (url) {
      res.redirect(url);
    });
  });
};

/*
 * GET /:fbapp/oauth/callback/physical
 *
 * FB callback for oauth for this specific fbapp when doing physical syncing
 */

exports.physicalcallback = function (req, res) {
  console.log("HIT PHYSICAL CALLBACK for", req.params.fbapp);
  database.getApiConfig(req.params.fbapp, function (err, apiConfig) {
    // Create Facebook client.
    var fb = rem.connect('facebook.com', '*').configure({
      secret: apiConfig.secret_key,
      key: apiConfig.api_key,
    });

    // Start and complete oauth.
    var oauth = rem.oauth(fb, 'http://' + req.app.get('host') + '/' + req.params.fbapp + '/oauth/callback/physical');
    oauth.start({
      scope: apiConfig.permissions
    }, function (url) {
      oauth.complete(req.url, function (err, user) {
        if (err) {
          res.json({message: 'Invalid login credentials or invalid app configuration.', err:err});
        } else {
          // Get basic info.
          user('me').get(function (err, json) {
            if (err) {
              res.send('Could not retrieve user information.');
            } else {
              user.saveState(function (state) {
                database.storeAuthTokens(req.params.fbapp, json.id, state, function () {
                  
                    // Now we store the pid binding
                    database.getDeviceBinding(req.session.pid, function (err, binding) {
                      if (err || !binding || binding.fbid == json.id) { // this means it hasn't been taken, which is good
                        database.setDeviceBinding(req.session.pid, json.id, function (err) {
                          console.log('Device', req.session.pid, 'user', json.id);
                          // Everything is okay, and we can redirect back, first logging them out
                          var fbLogoutUri = 'https://www.facebook.com/logout.php?next=' + apiConfig.callback_url + '&access_token=' + state.oauthAccessToken;
                          // console.log(fbLogoutUri);
                          res.redirect(fbLogoutUri);
                        });
                      } else { // this is taken, and bad
                        console.log("SYNC ERROR:");
                        console.log(err);
                        console.log(json.id);
                        res.json({error: true, message: 'Device already associated with this account. Please unbind first or get a different ID.'}, 401);
                      }
                    });
                });
              });
            }
          });
        }
      });
    });
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
  console.log("HIT CALLBACK for", req.params.fbapp);
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
              });
            }
          });
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

/*
 * GET /:fbapp/authToken
 *
 * Lets the user see their own auth token for the app.
 */

 exports.getAuthToken = function (req, res) {
  if ((typeof(helper.getSessionId(req)) == "undefined")) {
    return res.redirect('/');
  }
  // database.getApiConfig(req.app.get('fbapp'), function (err, lgconfig) {
    database.getAuthTokens(req.params.fbapp, helper.getSessionId(req), function (err, lgtokens) {
      if (err) {
        return res.redirect('/');
      }
      helper.getUser(req, lgtokens, function(err, fbuser) {
        res.render('authToken', { 
          title: 'lifegraph Connect', 
          lifegraphConnected: true, 
          app: req.params.fbapp, 
          token: lgtokens.tokens.oauthAccessToken,
          fbuser: fbuser
        });
      });
    });
  // });
 }


