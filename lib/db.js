var assert = require('assert-plus');
var bunyan = require('bunyan');
var events = require('events');
var sqlite3 = require('sqlite3');
var util = require('util');
var vasync = require('vasync');

var USERS_SCHEMA = ' \
   CREATE TABLE IF NOT EXISTS users ( \
      name TEXT PRIMARY KEY, \
      secret TEXT NOT NULL, \
      createTime INTEGER NOT NULL \
   ) \
';

function Db(opts) {
        assert.object(opts);
        assert.string(opts.fileName, 'opts.fileName');
        assert.object(opts.log, 'opts.log');

        var self = this;

        self.fileName = opts.fileName;
        self.log = opts.log;
        self.db = new sqlite3.Database(opts.fileName);

        self.db.on('open', function (err) {
                if (err) {
                        self.emit('error', err);
                        return;
                }

                vasync.pipeline({
                        funcs: [
                                function (_, cb) { self.db.run(USERS_SCHEMA, cb); }
                        ]
                }, function (err2) {
                        if (err2) {
                                self.emit('error', err2);
                                return;
                        }
                        self.emit('ready');
                });
        });
}

util.inherits(Db, events.EventEmitter);
module.exports.Db = Db;

/**
 * Puts a user.  Required fields:
 *   name: The name of the user.
 *   secret: The shared secret for the user.
 */
Db.prototype.putUser = function(user, cb) {
        assert.string(user.name, 'user.name');
        assert.string(user.secret, 'user.secret');
        assert.func(cb);

        var self = this;
        var bind = {
                $secret: user.secret,
                $name: user.name
        };

        function insert() {
                bind['$createTime'] = (new Date()).getTime();
                var sql = 'INSERT INTO users (name, secret, createTime) ' +
                        'VALUES ($name, $secret, $createTime)';
                self.db.run(sql, bind, function (err) {
                        if (err) {
                                cb(err);
                                return;
                        }
                        if (this.changes === 0) {
                                cb(new Error('unable to insert for unknown ' +
                                             'reason'));
                                return;
                        }
                        cb();
                });
        }

        function update() {
                var sql = 'UPDATE users SET secret = $secret' +
                        ' WHERE name = $name';
                self.db.run(sql, bind, function (err) {
                        if (err) {
                                cb(err);
                                return;
                        }
                        if (this.changes === 0) {
                                insert();
                        } else {
                                cb();
                        }
                });
        }

        update();
}

Db.prototype.getUser = function(name, cb) {
        assert.string(name);
        assert.func(cb);

        var self = this;
        var sql = 'SELECT * FROM users WHERE name = $name';
        var bind = { $name: name };
        self.db.get(sql, bind, function (err, row) {
                cb(err, row);
        });
}

Db.prototype.deleteUser = function(name, cb) {
        assert.string(name);
        assert.func(cb);

        var self = this;
        var sql = 'DELETE FROM users WHERE name = $name';
        var bind = { $name: name };
        self.db.run(sql, bind, function (err) {
                cb(err);
        });
}
