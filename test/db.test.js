var assert = require('assert-plus');
var db = require('../lib/db');
var fs = require('fs');
var helper = require('./helper');
var vasync = require('vasync');

var test = helper.test;
var log = helper.createLogger();

var TEMP_DB_FILENAME = '/tmp/mini_lds_tools_sqlite_test_db';
var DB = null;

helper.before(function (cb) {
        DB = new db.Db({
                fileName: TEMP_DB_FILENAME,
                log: log
        });

        DB.on('ready', function () {
                cb();
        });

        DB.on('error', function (err) {
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
                                DB.putUser(u, function (err) {
                                        cb(err);
                                });
                        },
                        // Get
                        function (_, cb) {
                                DB.getUser(n, function (err, user) {
                                        if (err) {
                                                cb(err);
                                                return;
                                        }
                                        t.equal(n, user.name);
                                        t.equal(s1, user.secret);
                                        createTime = user.createTime;
                                        cb();
                                });
                        },
                        // Update
                        function (_, cb) {
                                var u = { name: n, secret: s2 };
                                 DB.putUser(u, function (err) {
                                        cb(err);
                                });
                        },
                        // Get && Verify Update
                        function (_, cb) {
                                DB.getUser(n, function (err, user) {
                                        if (err) {
                                                cb(err);
                                                return;
                                        }
                                        t.equal(n, user.name);
                                        t.equal(s2, user.secret);
                                        t.equal(createTime, user.createTime);
                                        cb();
                                });
                        },
                        // Delete
                        function (_, cb) {
                                DB.deleteUser(n, function (err) {
                                        cb(err);
                                });
                        },
                        // Double delete to verify idempotency
                        function (_, cb) {
                                DB.deleteUser(n, function (err) {
                                        cb(err);
                                });
                        },
                        // Get && Verify Delete
                        function (_, cb) {
                                DB.getUser(n, function (err, user) {
                                        if (err) {
                                                cb(err);
                                                return;
                                        }
                                        t.ok(user === undefined);
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
        var n1 = 'Nathan Hansen';
        var n2 = 'Nate Hansen';
        vasync.pipeline({
                funcs: [
                        // Create
                        function (_, cb) {
                                var m = { id: id, fullName: n1 };
                                DB.putMember(m, function (err) {
                                        cb(err);
                                });
                        },
                        // Get
                        function (_, cb) {
                                DB.getMember(id, function (err, member) {
                                        if (err) {
                                                cb(err);
                                                return;
                                        }
                                        t.equal(id, member.id);
                                        t.equal(n1, member.fullName);
                                        t.ok(member.known === null);
                                        t.ok(member.active === null);
                                        cb();
                                });
                        },
                        // Update
                        function (_, cb) {
                                var m = { id: id, fullName: n2 };
                                DB.putMember(m, function (err) {
                                        cb(err);
                                });
                        },
                        function (_, cb) {
                                var args = { id: id, known: 'no' };
                                DB.updateKnown(args, function (err) {
                                        cb(err);
                                });
                        },
                        function (_, cb) {
                                var args = { id: id, active: 'yes' };
                                DB.updateActive(args, function (err) {
                                        cb(err);
                                });
                        },
                        // Get && Verify Update
                        function (_, cb) {
                                DB.getMember(id, function (err, member) {
                                        if (err) {
                                                cb(err);
                                                return;
                                        }
                                        t.equal(id, member.id);
                                        t.equal(n2, member.fullName);
                                        t.equal('no', member.known);
                                        t.equal('yes', member.active);
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
                                DB.addComment(opts, function (err) {
                                        cb(err);
                                });
                        },
                        // Get and Verify
                        function (_, cb) {
                                DB.getComments(member.id, function (err, res) {
                                        t.ok(res.length === 1);
                                        assert.object(res[0]);
                                        t.equal(res[0].id, member.id);
                                        t.equal(res[0].createTime, d1);
                                        t.equal(res[0].comment, c1);
                                        cb(err);
                                });
                        },
                        // Add the second
                        function (_, cb) {
                                var opts = { member: member,
                                             createTime: d2,
                                             comment: c2
                                           };
                                DB.addComment(opts, function (err) {
                                        cb(err);
                                });
                        },
                        // Get and Verify both, correct order
                        function (_, cb) {
                                DB.getComments(member.id, function (err, res) {
                                        t.ok(res.length === 2);
                                        assert.object(res[0]);
                                        assert.object(res[1]);
                                        t.equal(res[0].id, member.id);
                                        t.equal(res[0].createTime, d1);
                                        t.equal(res[0].comment, c1);
                                        t.equal(res[1].id, member.id);
                                        t.equal(res[1].createTime, d2);
                                        t.equal(res[1].comment, c2);
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

test('mls', function (t) {
        var file = 'data/db.test.js/sample_mls_dump.csv';
        var r = null;
        vasync.pipeline({
                funcs: [
                        function (_, cb) {
                                var error = false;
                                r = fs.createReadStream(file);

                                r.on('open', function () {
                                        var opts = {
                                                'reader': r
                                        };
                                        DB.loadMls(opts, function (err) {
                                                if (!error) {
                                                        cb(err);
                                                }
                                        });
                                });

                                r.on('error', function (err) {
                                        error = true;
                                        cb(err);
                                });
                        },
                        function (_, cb) {
                                DB.getAllMls(function (err, res) {
                                        //Test some random rows.
                                        t.ok(res.length === 2);
                                        t.ok(res[0].recordNumber ===
                                                  '000');
                                        t.ok(res[0].fullName ===
                                                  'Smith, Ross');
                                        t.ok(res[1].recordNumber ===
                                                  '001');
                                        t.ok(res[1].isMember ===
                                                  'Yes');
                                        cb();
                                });
                        },
                        function (_, cb) {
                                DB.getJoinedMember('000', function (err, m) {
                                        assert.object(m, 'member');
                                        t.equal('000', m.id);
                                        t.equal('000', m.recordNumber);
                                        t.equal('Smith, Ross', m.fullName);
                                        t.ok(null === m.known);
                                        t.ok(null === m.active);
                                        cb();
                                });
                        },
                        function (_, cb) {
                                var opts = { field: 'fullName',
                                             term: 'i' };
                                DB.searchMls(opts, function (err, res) {
                                        t.equal(2, res.length);
                                        t.ok(res[0].recordNumber ===
                                                  '000');
                                        t.ok(res[0].fullName ===
                                                  'Smith, Ross');
                                        t.ok(res[1].recordNumber ===
                                                  '001');
                                        t.ok(res[1].isMember ===
                                                  'Yes');
                                        cb();
                                });
                        },
                        function (_, cb) {
                                var opts = { field: 'fullName',
                                             term: 'Ross' };
                                DB.searchMls(opts, function (err, res) {
                                        t.equal(1, res.length);
                                        t.ok(res[0].recordNumber ===
                                                  '000');
                                        t.ok(res[0].fullName ===
                                                  'Smith, Ross');
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
