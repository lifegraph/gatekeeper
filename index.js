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
  app.use(express.errorHandler());
});

app.configure('production', function () {
  app.set('host', 'connect.lifegraphlabs.com')
})

/**
 * Routes
 */

app.get('/', index.index);

// FB App endpoints
// Administration control panel.
app.get('/:fbapp/admin', fbapp.adminMiddleware, fbapp.admin);
// Update device administration.
app.post('/:fbapp/admin', fbapp.adminMiddleware, fbapp.adminPost);
// First part of Facebook auth dance.
app.get('/:fbapp/login', fbapp.login);
// Response from Facebook with access token.
app.get('/:fbapp/oauth/callback', fbapp.callback);
// Allows the user to log out of an application.
app.get('/:fbapp/logout', fbapp.logout);

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