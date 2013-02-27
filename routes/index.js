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
      var lifegraphConnected = false;
      apis = apis.filter(function(app) {
        if (app.namespace == req.app.get('fbapp')) { // check for the app running this connect server
          lifegraphConnected = app.connected;
          return false;
        }
        return true;
      });
      res.render('index', {
        title: 'Lifegraph Connect',
        apps: apis || [],
        devices: helper.getSessionId(req) && devices,
        lifegraphConnected: lifegraphConnected,
        lifegraphNamespace: req.app.get('fbapp'),
        fbid: helper.getSessionId(req)
      });
    });
  });
}