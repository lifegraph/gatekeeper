/**
 * database operations
 */


var mongojs = require('mongojs')
  , async = require('async')
  , helper = require('./helper');

// device <-> fb user mappings.

console.log(process.env.MONGOLAB_URI)
var db = mongojs(process.env.MONGOLAB_URI || 'gate-keeper', [
  'api_keys',
  'auth_tokens',
  'pids'
]);

exports.getDeviceBinding = function (pid, next) {
  db.pids.findOne({
    "pid": pid
  }, next);
}

exports.getUserDevice = function (fbid, next) {
  db.pids.findOne({
    "fbid": fbid
  }, next);
}

exports.setDeviceBinding = function (pid, fbid, next) {
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

exports.removeDeviceBinding = function (pid, fbid, next) {
  db.pids.remove({
    "pid": pid,
    "fbid": fbid
  }, next);
}

// Apps

exports.getApps = function (req, callback) {
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
      getAuthTokens(item.namespace, helper.getSessionId(req), function (err, tokens) {
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

exports.getApiConfig = function (namespace, callback) {
  db.api_keys.findOne({
    'namespace': namespace,
  }, callback);
}

exports.setApiConfig = function (namespace, props, callback) {
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

exports.storeAuthTokens = function (namespace, fbid, tokens, next) {
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

exports.getAuthTokens = function (namespace, fbid, next) {
  db.auth_tokens.findOne({
    namespace: namespace,
    fbid: fbid
  }, next);
}

exports.deleteAuthTokens = function (namespace, fbid, next) {
  db.auth_tokens.remove({
    namespace: namespace,
    fbid: fbid
  }, next);
}