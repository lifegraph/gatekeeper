/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , mongojs = require('mongojs')
  , path = require('path')
  , fs = require('fs')
  , rem = require('rem')
  , async = require('async')
  , socketio = require('socket.io');

/**
 * App configuration.
 */

var app = express();
var server = http.createServer(app);
var db;

app.configure(function () {
  console.log(process.env.MONGOLAB_URI)
  db = mongojs(process.env.MONGOLAB_URI || 'gate-keeper', [
    'api_keys',
    'auth_tokens',
    'pids'
  ]);
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.cookieSession({
    secret: 'its my noah tye its my noah tye its my noah tye its my noah tye'
  }));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use('/', express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
  app.set('host', 'localhost:' + app.get('port'));
  app.use(express.errorHandler());
});

app.configure('production', function () {
  app.set('host', 'connect.lifegraphlabs.com')
})

/**
 * Socket.io
 */

var io = socketio.listen(server);
io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

/**
 * Database operations
 */

// device <-> fb user mappings.

function getDeviceBinding (pid, next) {
  db.pids.findOne({
    "pid": pid
  }, next);
}

function getUserDevice (fbid, next) {
  db.pids.findOne({
    "fbid": fbid
  }, next);
}

function setDeviceBinding (pid, fbid, next) {
  db.pids.update({
    "pid": pid
  }, {
    "pid": pid,
    "fbid": fbid
  }, {
    upsert: true,
    safe: true
  }, next); 
}

function removeDeviceBinding (pid, fbid, next) {
  db.pids.remove({
    "pid": pid,
    "fbid": fbid
  }, next);
}

/*
function setFbUser (namespace, deviceid, fbuser, callback) {
  db.collection(namespace, function (err, collection) {
    collection.update({'deviceid': deviceid}, {
      'deviceid': deviceid,
      'fbuser': fbuser
    }, {safe: true, upsert: true}, callback);
  });
}

function getFbUser(namespace, deviceid, callback) {
  db.collection(namespace, function (err, collection) {
    collection.findOne({
      'deviceid': deviceid,
    }, function (err, item) {
        callback(item);
    });
  });
}

function getDeviceId(namespace, fbuser, callback) {
  db.collection(namespace, function (err, collection) {
    collection.findOne({
      'fbuser': fbuser,
    }, function (err, item) {
        callback(item);
    });
  });
}

function getUnclaimedDeviceIds (namespace, callback) {
  db.collection(namespace, function (err, collection) {
    collection.find({
      'fbuser': null
    }, function (err, cursor) {
      cursor.toArray(function (err, items) {
        callback(items);
      });
    });
  });
}
*/

/*
function getAllFbUsers (namespace, callback) {
  db.collection(namespace, function (err, collection) {
    collection.find({}, function (err, items) {
        callback(items);
      });
    });
  });
}
*/

// Apps

function getApps (req, callback) {
  db.api_keys.find({}, function (err, items) {
    async.map((items || []).map(function (c) {
      return {
        namespace: c.namespace,
        image: c.image,
        description: c.description,
        name: c.name,
        app_permissions: c.app_permissions ? c.app_permissions.split(/,\s*/) : [],
        connected: false
      };
    }), function (item, next) {
      getAuthTokens(item.namespace, getSessionId(req), function (err, tokens) {
        if (!err && tokens) {
          item.connected = true;
        }
        next(null, item);
      });
    }, function (err, items) {
      callback(err, items);
    });
  });
}

// API keys.

function getApiConfig (namespace, callback) {
  db.api_keys.findOne({
    'namespace': namespace,
  }, callback);
}

function setApiConfig (namespace, props, callback) {
  db.api_keys.update({
    'namespace': namespace
  }, {
    $set: props
  }, {
    safe: true,
    upsert: true
  }, callback);
}

// User auth tokens.

function storeAuthTokens (namespace, fbid, tokens, next) {
  db.auth_tokens.update({
    namespace: namespace,
    fbid: fbid
  }, {
    namespace: namespace,
    fbid: fbid,
    tokens: tokens
  }, {
    safe: true,
    upsert: true
  }, next);
}

function getAuthTokens (namespace, fbid, next) {
  db.auth_tokens.findOne({
    namespace: namespace,
    fbid: fbid
  }, next);
}

function deleteAuthTokens (namespace, fbid, next) {
  db.auth_tokens.remove({
    namespace: namespace,
    fbid: fbid
  }, next);
}

/** 
 * Helpers
 */

function getSessionId (req) {
  return req.session.fbid;
}

function setSessionId (req, id) {
  req.session.fbid = id;
}

function removeSessionId (req) {
  return delete req.session.fbid;
}

/**
 * Routes
 */

app.get('/', function (req, res) {
  getUserDevice(getSessionId(req), function (err, device) {
    getApps(req, function (err, apis) {
      res.render('index', {
        title: 'Lifegraph Connect',
        apps: apis || [],
        connected: true,
        device: getSessionId(req) && device
      });
    });
  });
});

// Administration control panel.

app.get('/:fbapp/admin', function (req, res) {
  getApiConfig(req.params.fbapp, function (err, apiconfig) {
    res.render('namespace', {
      namespace: req.params.fbapp,
      apiconfig: apiconfig || {},
      fbusers: []
    });
  });
});

// Update device administration.

app.post('/:fbapp/admin', function (req, res) {
  console.log(req.body);
  var props = {
    'permissions': req.body.scope,
    'callback_url': req.body.callbackurl,
    'name': req.body.name,
    'description': req.body.description,
    "image": req.body.image,
    'app_permissions': req.body.app_permissions
  }
  if (req.body.apikey && req.body.secretkey) {
    props.api_key = req.body.apikey;
    props.secret_key = req.body.secretkey;
  }
  setApiConfig(req.params.fbapp, props, function () {
    res.redirect('/' + req.params.fbapp + '/admin');
  });
});

// First part of Facebook auth dance.
app.get('/:fbapp/login', function (req, res) {
  getApiConfig(req.params.fbapp, function (err, config) {
    if (!config) {
      return res.send('No app found.', 404);
    }

    // Create Facebook client.
    var fb = rem.connect('facebook.com', '*').configure({
      key: config.api_key,
      secret: config.secret_key
    });

    // Start oauth login.
    var oauth = rem.oauth(fb, 'http://' + app.get('host') + '/' + req.params.fbapp + '/oauth/callback');
    oauth.start({
      scope: config.permissions
    }, function (url) {
      res.redirect(url);
    });
  });
});

// Response from Facebook with access token.

app.get('/:fbapp/oauth/callback', function (req, res) {
  getApiConfig(req.params.fbapp, function (err, keys) {
    // Create Facebook client.
    var fb = rem.connect('facebook.com', '*').configure({
      key: keys.api_key,
      secret: keys.secret_key
    });

    // Start and complete oauth.
    var oauth = rem.oauth(fb, 'http://' + app.get('host') + '/' + req.params.fbapp + '/oauth/callback');
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
                storeAuthTokens(req.params.fbapp, json.id, state, function () {
                  setSessionId(req, json.id);
                  res.redirect('/');
                });
              })
            }
          })
        }
      });
    });
  });
});

// Allows the user to log out of an application.

app.get('/:fbapp/logout', function (req, res) {
  deleteAuthTokens(req.params.fbapp, getSessionId(req), function () {
    removeSessionId(req);
    res.redirect('/');
  });
});

/**
 * API
 */

// Recover tokens for a physical ID. Expect namespace, appid, and secret in the request query.

app.get('/api/tokens/:pid', function (req, res) {
  // Validate authorization.
  getApiConfig(req.query.namespace, function (err, config) {
    if (err || !config || config.api_key != req.query.key || config.secret_key != req.query.secret) {
      // Return 404 to not expose implementation details.
      res.json({error: 'Invalid credentials.'}, 401);
    } else {
      getDeviceBinding(req.params.pid, function (err, binding) {
        if (err || !binding) {
          res.json({error: 'Could not find physical ID.'}, 404);
          io.sockets.emit('unmapped-pid', {
            pid: req.params.pid,
            namespace: req.query.namespace
          });

        } else {
          getAuthTokens(req.query.namespace, binding.fbid, function (err, tokens) {
            if (err || !tokens) {
              res.json({error: 'No tokens found.'}, 404);
            } else {
              res.json({tokens: tokens.tokens});
            }
          })
        }
      })
    }
  });
});

app.post('/api/tokens/:pid', function (req, res) {
  console.log('get binding');
  getDeviceBinding(req.params.pid, function (err, binding) {
    if (err || !binding) {
      setDeviceBinding(req.params.pid, getSessionId(req), function (err) {
        console.log('Device', req.params.pid, 'bound to', req.query.namespace, 'user', getSessionId(req));
        res.json({error: false, message: 'Cool digs man.'}, 201);
      });
    } else {
      res.json({error: true, message: 'Device already associated with this account. Please unbind first.'}, 401);
    }
  });
});

app.del('/api/tokens/:pid', function (req, res) {
  console.log('delete binding');
  removeDeviceBinding(req.params.pid, getSessionId(req), function (err, flag) {
    if (flag) {
      res.json({error: false, message: 'Tokens deleted.'}, 201);
    } else {
      res.json({error: true, message: 'Token not deleted.'}, 401);
    }
  });
})

/**
 * Launch.
 */
 
server.listen(app.get('port'), function () {
  console.log("Express server listening http://" + app.get('host'));
});