#!/usr/bin/node

var db = require('./db');
var fs = require('fs');

///--- Common stuff.

/**
 * This assumes an optimist argv object with the following fields:
 *   c: (optional) A config file that contains relevant config parameters.
 *   d: (optional) A dbFile path to the sqlite3 db.
 */
function setup(argv, log, cb) {
        var dbFile = argv.d;
        if (!dbFile && !argv.c) {
                cb(new Error('config file or db filename required.'));
                return;
        } else if (!dbFile) {
                var cfgFileName = argv.c;
                var stats = fs.statSync(cfgFileName);
                if (!stats || !stats.isFile()) {
                        cb(new Error('config file cannot be found.'));
                        return;
                }
                var cfg = null;
                try {
                        cfg = JSON.parse(fs.readFileSync(cfgFileName));
                } catch (e) {
                        cb(e);
                        return;
                }
                if (!cfg.dbFile) {
                        cb(new Error('Config file contains no dbFile field.'));
                        return;
                }
                dbFile = cfg.dbFile;
        }

        var d = new db.Db({
                'fileName': dbFile,
                'log': log
        });

        d.on('ready', function () {
                cb(null, d);
        });

        d.on('error', function (err) {
                cb(err);
        });
}

module.exports.setup = setup;
