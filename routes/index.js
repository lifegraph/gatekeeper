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
      apis = apis.filter(function(app) {
        if (app.namespace == 'lifegraph') {
          lifegraphConnected = app.connected;
          return false;
        }
        return true;
      });

      res.render('index', {
        title: 'Lifegraph Connect',
        apps: apis || [],
        device: helper.getSessionId(req) && device,
        lifegraphConnected: lifegraphConnected,
        fbid: helper.getSessionId(req)
      });
    });
  });
}