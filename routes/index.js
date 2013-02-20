/*
 * Handles "/"" index request
 */

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
      res.render('index', {
        title: 'Lifegraph Connect',
        apps: apis || [],
        device: helper.getSessionId(req) && device,
        fbid: helper.getSessionId(req)
      });
    });
  });
}