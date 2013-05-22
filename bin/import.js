#!/usr/bin/node

var bunyan = require('bunyan');
var fs = require('fs');
var lib = require('../lib');
var optimist = require('optimist');
var vasync = require('vasync');

var argv = optimist.options({
        'c': {
                'alias': 'config',
                'default': './etc/config.json',
                'description': 'Config file can define: dbFile'
        },
        'd': {
                'alias': 'dbFile',
                'description': 'Path to sqlite3'
        },
        'f': {
                'alias': 'file',
                'description': 'MLS dump file',
                'demand': true
        }
}).argv;

var log = bunyan.createLogger({
        name: 'import.js',
        stream: process.stdout,
        level: 'info'
});

var DB = null;
var STREAM = null;

vasync.pipeline({
        funcs: [
                function (_, cb) {
                        lib.binCommon.setup(argv, log, function (err, db) {
                                if (err) {
                                        cb(err);
                                        return;
                                }
                                DB = db;
                                cb();
                        });
                },
                function (_, cb) {
                        fs.stat(argv.f, function (err, stats) {
                                if (err) {
                                        cb(err);
                                        return;
                                }
                                if (!stats.isFile()) {
                                        cb(new Error(argv.f +
                                                     ' is not a file'));
                                        return;
                                }
                                cb();
                        });
                },
                function (_, cb) {
                        STREAM = fs.createReadStream(argv.f);
                        STREAM.on('open', function (fd) {
                                cb();
                        });
                        STREAM.on('error', function (err) {
                                console.error(err);
                                process.exit(1);
                        });
                },
                function (_, cb) {
                        DB.loadMls({
                                reader: STREAM
                        }, function (err) {
                                if (err) {
                                        cb(err);
                                        return;
                                }
                                cb();
                        });
                }
        ]
}, function (err) {
        if (err) {
                console.error(err);
        }
});

