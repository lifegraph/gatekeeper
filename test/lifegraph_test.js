// we have no tests...
// this script performs a full test on the production url

var lifegraph = require('lifegraph');

var pid = '101';

lifegraph.configure('entrance-tutorial', "481848201872129", "f2696ba2416ae6a4cc9cbde1dddd6a5b");

lifegraph.connect(pid, function (err, json) {
  console.log(err, json);
})