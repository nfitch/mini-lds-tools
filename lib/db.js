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

var MEMBERS_SCHEMA = ' \
   CREATE TABLE IF NOT EXISTS members ( \
      id TEXT PRIMARY KEY, \
      firstName TEXT, \
      lastName TEXT, \
      known TEXT, \
      active TEXT \
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
                                function (_, cb) {
                                        self.db.run(USERS_SCHEMA, cb);
                                },
                                function (_, cb) {
                                        self.db.run(MEMBERS_SCHEMA, cb);
                                }
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

///--- Users

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

///--- Members

Db.prototype.putMember = function(member, cb) {
        assert.string(member.id, 'member.id');
        assert.optionalString(member.firstName, 'member.firstName');
        assert.optionalString(member.lastName, 'member.lastName');
        assert.func(cb);

        var self = this;
        var bind = {
                $id: member.id,
                $firstName: member.firstName,
                $lastName: member.lastName
        };

        function insert() {
                //Leaving known and active null.
                var sql = 'INSERT INTO members ' +
                        '(id, firstName, lastName) ' +
                        'VALUES ($id, $firstName, $lastName)';
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
                var sql = 'UPDATE members SET ' +
                        'firstName = $firstName, ' +
                        'lastName = $lastName ' +
                        'WHERE id = $id';
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

//TODO: Join with the mls table.
Db.prototype.getMember = function(id, cb) {
        assert.string(id, 'id');
        assert.func(cb, 'cb');

        var self = this;
        var sql = 'SELECT * FROM members WHERE id = $id';
        var bind = { $id: id };
        self.db.get(sql, bind, function (err, row) {
                cb(err, row);
        });
}

// Intentionally not implementing delete.

Db.prototype.updateKnown = function(member, cb) {
        assert.string(member.id, 'member.id');
        assert.string(member.known, 'member.known');
        assert.ok(['yes', 'no'].indexOf(member.known) !== -1,
                  'member.known (yes, no)');

        var self = this;
        var sql = 'UPDATE members SET known = $known WHERE id = $id';
        var bind = { $id: member.id, $known: member.known };
        self.db.run(sql, bind, function (err) {
                if (err) {
                        cb(err);
                        return;
                }
                if (this.changes === 0) {
                        cb(new Error('unable to update member for ' +
                                     'unknown reasons'));
                } else {
                        cb();
                }
        });
}

Db.prototype.updateActive = function(member, cb) {
        assert.string(member.id, 'member.id');
        assert.string(member.active, 'member.active');
        assert.ok(['yes', 'no'].indexOf(member.active) !== -1,
                  'member.active (yes, no)');

        var self = this;
        var sql = 'UPDATE members SET active = $active WHERE id = $id';
        var bind = { $id: member.id, $active: member.active };
        self.db.run(sql, bind, function (err) {
                if (err) {
                        cb(err);
                        return;
                }
                if (this.changes === 0) {
                        cb(new Error('unable to update member for ' +
                                     'unknown reasons'));
                } else {
                        cb();
                }
        });
}
