/**
 * /admin/* Admin requests
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

exports.adminlist = function (req, res) {
  database.getApiConfig('lifegraph', function (err, lgconfig) {
    database.getAuthTokens('lifegraph', helper.getSessionId(req), function (err, lgtokens) {
      if (err || !lgtokens) {
        console.log("REDIRECTING Err or No lifegraph tokens");
        console.log(err);
        console.log(lgtokens);
        return res.redirect('/lifegraph/login');
      }

      // Create Facebook client.
      var fb = rem.connect('facebook.com', '*').configure({
        key: lgconfig.api_key,
        secret: lgconfig.secret_key
      });

      // Start oauth login.
      var oauth = rem.oauth(fb, 'http://' + req.app.get('host') + '/lifegraph/oauth/callback');
      var user = oauth.restore(lgtokens.tokens);

      user.validate(function (flag) {
        if (!flag) {
          console.log("REDIRECTING 2 invalid flag");
          console.log(flag);
          return res.redirect('/lifegraph/login');
        }

        user('me/applications/developer/').get(function (err, json) {
          var apps = json.data;
          res.render('adminlist', {apps: apps});
        });
      })
    });
  });
}