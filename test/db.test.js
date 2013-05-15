var assert = require('assert-plus');
var db = require('../lib/db');
var fs = require('fs');
var helper = require('./helper');
var vasync = require('vasync');

var test = helper.test;
var log = helper.createLogger();

var TEMP_DB_FILENAME = '/tmp/mini_lds_tools_sqlite_test_db';
var Db = null;

helper.before(function (cb) {
        Db = new db.Db({
                fileName: TEMP_DB_FILENAME,
                log: log
        });

        Db.on('ready', function () {
                cb();
        });

        Db.on('error', function (err) {
                cb(err);
        });
});

helper.after(function (cb) {
        fs.stat(TEMP_DB_FILENAME, function (err, stats) {
                if (err) {
                        cb(err);
                        return;
                }
                if (stats.isFile()) {
                        fs.unlink(TEMP_DB_FILENAME, function (err) {
                                cb(err);
                        });
                } else {
                        cb();
                }
        });
});

test('user crud', function (t) {
        var n = 'nate';
        var s1 = 'foo';
        var s2 = 'foo2';
        var createTime = null;
        vasync.pipeline({
                funcs: [
                        // Create
                        function (_, cb) {
                                var u = { name: n, secret: s1 };
                                Db.putUser(u, function (err) {
                                        cb(err);
                                });
                        },
                        // Get
                        function (_, cb) {
                                Db.getUser(n, function (err, user) {
                                        if (err) {
                                                cb(err);
                                                return;
                                        }
                                        assert.equal(n, user.name);
                                        assert.equal(s1, user.secret);
                                        createTime = user.createTime;
                                        cb();
                                });
                        },
                        // Update
                        function (_, cb) {
                                var u = { name: n, secret: s2 };
                                 Db.putUser(u, function (err) {
                                        cb(err);
                                });
                        },
                        // Get && Verify Update
                        function (_, cb) {
                                Db.getUser(n, function (err, user) {
                                        if (err) {
                                                cb(err);
                                                return;
                                        }
                                        assert.equal(n, user.name);
                                        assert.equal(s2, user.secret);
                                        assert.equal(createTime, user.createTime);
                                        cb();
                                });
                        },
                        // Delete
                        function (_, cb) {
                                Db.deleteUser(n, function (err) {
                                        cb(err);
                                });
                        },
                        // Double delete to verify idempotency
                        function (_, cb) {
                                Db.deleteUser(n, function (err) {
                                        cb(err);
                                });
                        },
                        // Get && Verify Delete
                        function (_, cb) {
                                Db.getUser(n, function (err, user) {
                                        if (err) {
                                                cb(err);
                                                return;
                                        }
                                        assert.ok(user === undefined);
                                        cb();
                                });
                        }
                ]
        }, function (err) {
                if (err) {
                        t.fail(err);
                        return;
                }
                t.done();
        });

});
