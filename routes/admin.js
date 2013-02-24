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
  database.getApiConfig(req.app.get('fbapp'), function (err, lgconfig) {
    database.getAuthTokens(req.app.get('fbapp'), helper.getSessionId(req), function (err, lgtokens) {
      if (err || !lgtokens) {
        console.log("REDIRECTING Err or No lifegraph tokens");
        console.log(err);
        console.log(lgtokens);
        return res.redirect('/' + req.app.get('fbapp') + '/login');
      }

      // Create Facebook client.
      var fb = rem.connect('facebook.com', '*').configure({
        key: lgconfig.api_key,
        secret: lgconfig.secret_key
      });

      // Start oauth login.
      var oauth = rem.oauth(fb, 'http://' + req.app.get('host') + '/' +req.app.get('fbapp') + '/oauth/callback');
      var user = oauth.restore(lgtokens.tokens);

      user.validate(function (flag) {
        if (!flag) {
          console.log("REDIRECTING 2 invalid flag");
          console.log(flag);
          return res.redirect('/' + req.app.get('fbapp') + '/login');
        }

        user('me/applications/developer/').get(function (err, json) {
          var apps = json.data;
          res.render('adminlist', {apps: apps});
        });
      })
    });
  });
}