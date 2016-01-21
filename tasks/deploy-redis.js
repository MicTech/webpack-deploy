var gulp = require('gulp');
var fs = require('fs');
var os = require('os');
var util = require('util');
var gutil = require('gulp-util');

var env = require('./utils').env;
var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;
var getRedisClient = require('./utils').getRedisClient;

//
// Deployment process tasks
//

function uploadFile(config, file, rev) {
  getRedisClient(config, function(client) {
    var timestamp = new Date();

    // Store index file under indexKey, e.g. 'app:<rev-number>'
    client.set(util.format(config.indexKey, rev), file);

    // Store timestamp information under 'app-timestamp:<rev-number>'
    // so we can compare if we have newer version than latest major rev
    if (config.revTimestampKey) {
      client.set(util.format(config.revTimestampKey, rev), timestamp);
    } else {
      gutil.log(gutil.colors.red(
        "Missing 'revTimestampKey' in config, unable to store rev timestamp."
      ));
    }

    // Store autor and timestamp info under metaKey, e.g. 'meta:<rev-number>'
    client.set(util.format(config.metaKey, rev), 'from ' + os.hostname() + ' on ' + timestamp);
    client.end();
  });
}

function deployRedis(config) {
  var file = fs.readFileSync(config.indexPath, 'utf8');

  getRevision(function (rev) {
    gutil.log(gutil.colors.yellow(env()), 'Uploading revision', gutil.colors.green(rev));
    uploadFile(config, file, rev);
  });
}

function printCurrentRev() {
  getRevision(function (rev) {
    gutil.log('Current revision', gutil.colors.green(rev));
  });
}

/**
 * Prints current revision number used as a redis key
 */
gulp.task('current-rev', [], printCurrentRev);


/**
 * Promotes specified revision as current
 */
gulp.task('deploy-redis', [], function() {
  deployRedis(getConfigFor('redis'));
});

