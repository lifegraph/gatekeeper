/*
 * Handles "/"" index request
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

/*
 * GET /
 */
 
exports.index = function (req, res) {
  database.getUserDevice(helper.getSessionId(req), function (err, device) {
    database.getApps(req, function (err, apis) {
      var lifegraphConnected = false;
      apis.forEach(function(app) {
        if (app.namespace == 'lifegraph') {
          lifegraphConnected = app.connected;
          apis.splice(app);
        }
      });

      if (lifegraphConnected) {
        rem
      }

      res.render('index', {
        title: 'Lifegraph Connect',
        apps: apis || [],
        connected: true,
        device: helper.getSessionId(req) && device,
        lifegraphConnected: lifegraphConnected
      });
    });
  });
}