/** 
 * Helpers
 */

exports.getSessionId = function (req) {
  return req.session.fbid;
}

exports.setSessionId = function (req, id) {
  req.session.fbid = id;
}

exports.removeSessionId = function (req) {
  return delete req.session.fbid;
}