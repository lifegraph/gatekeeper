/*
 * Routes for /api/tokens/* stuff
 * Handles getting, posting, deleting physical IDs and api tokens.
 * Call setServer with the server for the sockets to work
 */

/**
 * Local dependencies
 */

var database = require('../controllers/database')
  , helper = require('../controllers/helper');

var io;

// call this once before server is started
exports.setServer = function(server) {
  io = require('socket.io').listen(server);

  // Heroku does not allow websockets, we must use these settings
  io.configure(function () { 
    io.set("transports", ["xhr-polling"]); 
    io.set("polling duration", 10); 
    io.set("log level", 1);
  });
}

/*
 * GET /api/tokens/:pid
 *
 * Recover tokens for a physical ID.
 */

exports.pid = function (req, res) {
  // Validate authorization.
  database.getApiConfig(req.query.namespace, function (err, config) {
    if (err || !config || config.api_key != req.query.key || config.secret_key != req.query.secret) {
      // Return 401 to not expose implementation details.
      // console.log(config, req.query);
      res.json({error: 'Invalid credentials.'}, 401);
    } else {
      database.activateDeviceBinding(req.params.pid, helper.getSessionId(req), function (err) {
        if (err) {
          console.log("Fresh token: ", req.params.pid);
          database.incrementActivity(req.query.namespace, false, function () {
            res.json({error: 'Could not find physical ID.'}, 404);
            io.sockets.emit('unmapped-pid', {
              pid: req.params.pid,
              namespace: req.query.namespace
            });
          });
        } else {
          database.getAuthTokens(req.query.namespace, binding.fbid, function (err, tokens) {
            if (err || !tokens) {
              database.incrementActivityNoTokens(req.query.namespace, function () {
                console.log("No tokens found for pid: ", req.params.pid);
                res.json({error: 'No tokens found.'}, 406);
              });
            } else {
              database.incrementActivity(req.query.namespace, true, function () {
                res.json({
                  id: binding.fbid,
                  tokens: tokens.tokens
                });
              });
            }
          })
        }
      });
    }
  });
};

/*
 * POST /api/tokens/:pid
 *
 * Save tokens for a physical ID. Expect namespace, appid, and secret in the request query.
 */

exports.pidPost = function (req, res) {
  console.log('get binding');
  database.activateDeviceBinding(req.params.pid, helper.getSessionId(req), function (err) {
    if (err || !binding) {
      res.json({error: false, message: 'Cool digs man.'}, 201);
    } else {
      res.json({error: true, message: 'Device already associated with this account. Please unbind first.'}, 401);
    }
  });
};

/*
 * DEL /api/tokens/:pid
 *
 * Delete the physical ID from our system.
 */

exports.pidDel = function (req, res) {
  console.log('delete binding');
  database.removeDeviceBinding(req.params.pid, helper.getSessionId(req), function (err, flag) {
    if (flag) {
      res.json({error: false, message: 'Tokens deleted.'}, 201);
    } else {
      res.json({error: true, message: 'Token not deleted.'}, 401);
    }
  });
};