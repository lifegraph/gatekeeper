/** 
 * Helpers
 */

 var rem = require('rem');

var database = require('../controllers/database');

exports.getSessionId = function (req) {
  return req.session.fbid;
}

exports.setSessionId = function (req, id) {
  req.session.fbid = id;
}

exports.removeSessionId = function (req) {
  return delete req.session.fbid;
}


exports.getUser = function(req, lgtokens, callback) {
  if (!lgtokens || !lgtokens.tokens) {
    return callback({error: "No tokens given:" + lgtokens}, null);
  }
  database.getApiConfig(req.app.get('fbapp'), function (err, lgconfig) {
    var fb = rem.connect('facebook.com', '*').configure({
      key: lgconfig.api_key,
      secret: lgconfig.secret_key
    });

    // Start oauth login.
    var oauth = rem.oauth(fb, 'http://' + req.app.get('host') + '/' + req.app.get('fbapp') + '/oauth/callback');
    var user = oauth.restore(lgtokens.tokens);

    user.validate(function (flag) {
      if (!flag) {
        console.log("flag bad", flag);
        return callback({error: "Could not validate user creds"}, null);
      }

      user('me').get(function (err, json) {
        callback(err, json);
      });
    });
  });
}