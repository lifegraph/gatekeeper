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
      res.json({error: 'Invalid credentials.'}, 401);
    } else {
      database.getDeviceBinding(req.params.pid, function (err, binding) {
        if (err || !binding) {
          console.log("Fresh token: ", req.params.pid);
          res.json({error: 'Could not find physical ID.'}, 404);
          io.sockets.emit('unmapped-pid', {
            pid: req.params.pid,
            namespace: req.query.namespace
          });

        } else {
          database.getAuthTokens(req.query.namespace, binding.fbid, function (err, tokens) {
            if (err || !tokens) {
              console.log("No tokens found for pid: ", req.params.pid);
              res.json({error: 'No tokens found.'}, 404);
            } else {
              res.json({
                id: binding.fbid,
                tokens: tokens.tokens
              });
            }
          })
        }
      })
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
  database.getDeviceBinding(req.params.pid, function (err, binding) {
    if (err || !binding) {
      database.setDeviceBinding(req.params.pid, helper.getSessionId(req), function (err) {
        console.log('Device', req.params.pid, 'bound to', req.query.namespace, 'user', helper.getSessionId(req));
        res.json({error: false, message: 'Cool digs man.'}, 201);
      });
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