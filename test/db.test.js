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

test('member crud', function (t) {
        var id = '1234';
        var n1 = 'Nathan';
        var n2 = 'Nate';
        var l1 = 'Hansen';
        var l2 = 'Hanson';
        vasync.pipeline({
                funcs: [
                        // Create
                        function (_, cb) {
                                var m = { id: id, firstName: n1, lastName: l1 };
                                Db.putMember(m, function (err) {
                                        cb(err);
                                });
                        },
                        // Get
                        function (_, cb) {
                                Db.getMember(id, function (err, member) {
                                        if (err) {
                                                cb(err);
                                                return;
                                        }
                                        assert.equal(id, member.id);
                                        assert.equal(n1, member.firstName);
                                        assert.equal(l1, member.lastName);
                                        assert.ok(member.known === null);
                                        assert.ok(member.active === null);
                                        cb();
                                });
                        },
                        // Update
                        function (_, cb) {
                                var m = { id: id, firstName: n2, lastName: l2 };
                                Db.putMember(m, function (err) {
                                        cb(err);
                                });
                        },
                        function (_, cb) {
                                var args = { id: id, known: 'no' };
                                Db.updateKnown(args, function (err) {
                                        cb(err);
                                });
                        },
                        function (_, cb) {
                                var args = { id: id, active: 'yes' };
                                Db.updateActive(args, function (err) {
                                        cb(err);
                                });
                        },
                        // Get && Verify Update
                        function (_, cb) {
                                Db.getMember(id, function (err, member) {
                                        if (err) {
                                                cb(err);
                                                return;
                                        }
                                        assert.equal(id, member.id);
                                        assert.equal(n2, member.firstName);
                                        assert.equal(l2, member.lastName);
                                        assert.equal('no', member.known);
                                        assert.equal('yes', member.active);
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

test('comments', function (t) {
        var member = { id: '1234' };
        var d1 = '2013-05-10T05:19:19.000Z';
        var d2 = '2013-06-10T11:21:21.000Z';
        var c1 = 'Gave talk today.';
        var c2 = 'Called to the nursery.';
        vasync.pipeline({
                funcs: [
                        // Add one
                        function (_, cb) {
                                var opts = { member: member,
                                             createTime: d1,
                                             comment: c1
                                           };
                                Db.addComment(opts, function (err) {
                                        cb(err);
                                });
                        },
                        // Get and Verify
                        function (_, cb) {
                                Db.getComments(member.id, function (err, res) {
                                        assert.ok(res.length === 1);
                                        assert.object(res[0]);
                                        assert.equal(res[0].id, member.id);
                                        assert.equal(res[0].createTime, d1);
                                        assert.equal(res[0].comment, c1);
                                        cb(err);
                                });
                        },
                        // Add the second
                        function (_, cb) {
                                var opts = { member: member,
                                             createTime: d2,
                                             comment: c2
                                           };
                                Db.addComment(opts, function (err) {
                                        cb(err);
                                });
                        },
                        // Get and Verify both, correct order
                        function (_, cb) {
                                Db.getComments(member.id, function (err, res) {
                                        assert.ok(res.length === 2);
                                        assert.object(res[0]);
                                        assert.object(res[1]);
                                        assert.equal(res[0].id, member.id);
                                        assert.equal(res[0].createTime, d1);
                                        assert.equal(res[0].comment, c1);
                                        assert.equal(res[1].id, member.id);
                                        assert.equal(res[1].createTime, d2);
                                        assert.equal(res[1].comment, c2);
                                        cb(err);
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
