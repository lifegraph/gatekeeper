/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path');

/**
 * Local module dependencies
 */

var index = require('./routes/index')
  , fbapp = require('./routes/fbapp')
  , admin = require('./routes/admin')
  , api = require('./routes/api');

/**
 * App configuration.
 */

var app = express();
var server = http.createServer(app);

/**
 * Local dependency initialization
 */

api.setServer(server); // let the api know our server 

app.configure(function () {
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
  app.set('fbapp', 'lifegraph-local');
  app.use(express.errorHandler());
});

app.configure('production', function () {
  app.set('fbapp', 'lifegraph');
  app.set('host', 'lifegraphconnect.com')
})

/**
 * Routes
 */

app.get('/', index.lifeGraphSetUpMiddleWare, index.index);
app.get('/logout', index.lifeGraphSetUpMiddleWare, index.logout);

// Admin endpoints
app.get('/admin', admin.adminlist);

// FB App endpoints

// we are syncing a pid to this app
app.get('/:fbapp/sync/:pid', fbapp.sync)
// Administration control panel.
app.get('/:fbapp/admin', fbapp.adminMiddleware, fbapp.admin);
// Update device administration.
app.post('/:fbapp/admin', fbapp.adminMiddleware, fbapp.adminPost);
// sync with project with no screen
app.get('/:fbapp', fbapp.fbapp);
// First part of Facebook auth dance.
app.get('/:fbapp/login', fbapp.login);
// Response from Facebook with access token.
app.get('/:fbapp/oauth/callback', fbapp.callback);
// Response from Facebook for physical syncing (person tapped on app and wants to one-in sync).
app.get('/:fbapp/oauth/callback/physical', fbapp.physicalcallback);
// Response from Facebook for non-screen project, probably a phone.
app.get('/:fbapp/oauth/callback/fbapp', fbapp.fbappcallback);
// Allows the user to revoke connect access of an application.
app.get('/:fbapp/revoke', fbapp.revokeAccess);
// shows the user their auth token
app.get('/:fbapp/authToken', fbapp.getAuthToken);

// API
// Physical IDs
app.get('/api/tokens/:pid', api.pid);
app.post('/api/tokens/:pid', api.pidPost);
app.del('/api/tokens/:pid', api.pidDel);

/**
 * Launch.
 */
 
server.listen(app.get('port'), function () {
  console.log("Express server listening http://" + app.get('host'));
});