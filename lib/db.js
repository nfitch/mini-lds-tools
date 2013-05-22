var assert = require('assert-plus');
var bunyan = require('bunyan');
var carrier = require('carrier');
var events = require('events');
var sqlite3 = require('sqlite3');
var util = require('util');
var vasync = require('vasync');

var USERS_SCHEMA = ' \
   CREATE TABLE IF NOT EXISTS users ( \
      name TEXT PRIMARY KEY, \
      secret TEXT NOT NULL, \
      createTime TEXT NOT NULL \
   ) \
';

var MEMBERS_SCHEMA = ' \
   CREATE TABLE IF NOT EXISTS members ( \
      id TEXT PRIMARY KEY, \
      fullName TEXT, \
      known TEXT, \
      active TEXT \
   ) \
';

var COMMENTS_SCHEMA = ' \
   CREATE TABLE IF NOT EXISTS comments ( \
      id TEXT NOT NULL, \
      createTime TEXT NOT NULL, \
      comment TEXT NOT NULL, \
      PRIMARY KEY (id, createTime) \
   ) \
';

///--- Object

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
                                },
                                function (_, cb) {
                                        self.db.run(COMMENTS_SCHEMA, cb);
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

///--- Helpers

/**
 * Parses lines like this:
 *   "a","b",...,"z"
 *
 * Into an array.
 */
function parseCsvLine(line) {
        var parts = line.split('","');
        if (parts[0].indexOf('"') === 0) {
                parts[0] = parts[0].substring(1);
        }
        var end = parts.length - 1;
        if (parts[end].indexOf('"') === parts[end].length - 1) {
                parts[end] = parts[end].substring(0, parts[end].length - 1);
        }
        return parts;
}

function normalize(col) {
        var parts = col.split(' ');
        var ret = '';
        for (var i = 0; i < parts.length; ++i) {
                var s = parts[i];
                if (i === 0) {
                        ret += s.charAt(0).toLowerCase() + s.slice(1);
                } else {
                        ret += s.charAt(0).toUpperCase() + s.slice(1);
                }
        }
        return ret;
}

/**
 * Makes some huge assumptions:
 * 1) First column is the primary key
 * 2) All columns are text and can be null
 */
function createSchema(name, arr) {
        var s = 'CREATE TABLE IF NOT EXISTS mls (' +
                arr[0] + ' TEXT PRIMARY KEY';
        for (var i = 1; i < arr.length; ++i) {
                s += ', ' + arr[i] + ' TEXT';
        }
        s += ')';
        return s;
}

function insertStatement(table, header, vals) {
        var cols = '';
        var values = '';
        var bind = {};
        for (var i = 0; i < header.length; ++i) {
                if (cols.length !== 0) {
                        cols += ', ';
                        values += ', ';
                }
                var col = header[i];
                var val = vals[i];
                var b = '$' + col;
                bind[b] = val;
                cols += col;
                values += b;
        }
        return ({
                'statement': 'INSERT INTO ' + table + ' (' + cols + ') ' +
                        'VALUES (' + values + ')',
                'bind': bind
        });
}

///--- API

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
                bind['$createTime'] = (new Date()).toISOString();
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

Db.prototype.listUsers = function (cb) {
        assert.func(cb);

        var self = this;
        var sql = 'SELECT * FROM users';
        self.db.all(sql, cb);

}

///--- Members

Db.prototype.putMember = function(member, cb) {
        assert.string(member.id, 'member.id');
        assert.optionalString(member.fullName, 'member.fullName');
        assert.func(cb);

        var self = this;
        var bind = {
                $id: member.id,
                $fullName: member.fullName
        };

        function insert() {
                //Leaving known and active null.
                var sql = 'INSERT INTO members ' +
                        '(id, fullName) ' +
                        'VALUES ($id, $fullName)';
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
                        'fullName = $fullName ' +
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

///--- Comments

// http://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
function isValidDate(d) {
        if ( Object.prototype.toString.call(d) !== "[object Date]" )
                return false;
        return !isNaN(d.getTime());
}

Db.prototype.addComment = function(opts, cb) {
        assert.object(opts, 'opts');
        assert.object(opts.member, 'opts.member');
        assert.string(opts.member.id, 'opts.member.id');
        assert.string(opts.createTime, 'opts.createTime');
        assert.string(opts.comment, 'opts.comment');
        assert.func(cb);

        var d = new Date(opts.createTime);
        if (!isValidDate(d)) {
                cb(new Error('opts.createTime is not a valid date'));
                return;
        }

        var dString = d.toISOString();

        var self = this;
        var bind = {
                $id: opts.member.id,
                $createTime: dString,
                $comment: opts.comment
        };

        var sql = 'INSERT INTO comments ' +
                '(id, createTime, comment) ' +
                'VALUES ($id, $createTime, $comment)';
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

Db.prototype.getComments = function (id, cb) {
        assert.string(id, 'id');
        assert.func(cb, 'cb');

        var self = this;
        var bind = { $id: id };

        var sql = 'SELECT * FROM comments WHERE id = $id ' +
                'ORDER BY id, createTime';
        self.db.all(sql, bind, cb);
}

///--- mls

/**
 * This function blows away the current mls table and recreates it with the data
 * read from 'reader'.  The reader is expected to be in the following format:
 *
 *    "Record Number","Column 1","Column 2",...,"Column N"
 *    "1234","Foo","Bar",..."Truc"
 *    ...
 *
 * The schema is created from the columns that are in the dump.  The only
 * fields that are required are:
 * 1) "Record Number" column, since that is the field that is used to join with
 *    the "members" table.
 * 2) "Full Name", since that's what we use for long-term tracking in the
 *    members table.
 *
 * TODO: Not sure if this is doing too much and should be pulled apart...
 */
Db.prototype.loadMls = function (opts, cb) {
        assert.object(opts, 'opts');
        assert.object(opts.reader, 'opts.reader');
        assert.func(cb, 'cb');

        var self = this;

        opts.reader.pause();
        var readyForMore = false;
        var c = carrier.carry(opts.reader);
        var linesHandled = 0;
        var linesRead = 0;
        var cachedLines = [];
        var header = null;
        var endCalled = false;

        function tryEnd() {
                // +1 is for the header
                if (endCalled && linesRead === linesHandled + 1) {
                        cb();
                }
        }

        function handleLine(line) {
                var vals = parseCsvLine(line);
                if (vals[0] === '') {
                        // TODO: Fix me for those without #s?
                        ++linesHandled;
                        tryEnd();
                        return;
                }
                var i = insertStatement('mls', header, vals);
                // Insert in mls
                self.db.run(i.statement, i.bind, function (err) {
                        if (err) {
                                cb(err);
                                return;
                        }
                        if (this.changes === 0) {
                                cb(new Error('unable to insert row for ' +
                                             'unknown reasons'));
                                return;
                        }
                        var member = {
                                'id': i.bind['$recordNumber'],
                                'fullName': i.bind['$fullName']
                        };
                        // Insert in members
                        self.putMember(member, function (err) {
                                if (err) {
                                        cb(err);
                                        return;
                                }
                                ++linesHandled;
                                tryEnd();
                        });
                });
        }

        c.on('line', function (line) {
                ++linesRead;
                if (linesRead === 1) {
                        var readyForMore = false;
                        // Pause while we do the schema stuff...
                        opts.reader.pause();
                        var funcs = [
                                // Check the line, drop table if exists
                                function (_, subcb) {
                                        var l = parseCsvLine(line);
                                        if (l[0] !== 'Record Number') {
                                                var m = 'Header\'s first ' +
                                                        'column is not ' +
                                                        'Record Number';
                                                subcb(new Error(m));
                                                return;
                                        }
                                        header = l.map(normalize);
                                        subcb();
                                },
                                function (_, subcb) {
                                        var sql = 'DROP TABLE IF EXISTS mls';
                                        self.db.run(sql, subcb);
                                },
                                function (_, subcb) {
                                        var schema = createSchema(
                                                'mls', header);
                                        self.db.run(schema, subcb);
                                },
                                // Process Cached Lines
                                function (_, subcb) {
                                        for (var i = 0; i < cachedLines.length;
                                             ++i) {
                                                handleLine(cachedLines[i]);
                                        }
                                        subcb();
                                }
                        ];

                        vasync.pipeline({
                                funcs: funcs
                        }, function (err) {
                                if (err) {
                                        cb(err);
                                        return;
                                }
                                readyForMore = true;
                                opts.reader.resume();
                        });
                } else if (!readyForMore) {
                        cachedLines.push(line);
                } else {
                        handleLine(line);
                }
        });

        c.on('error', function (err) {
                cb(err);
        });

        c.on('end', function () {
                endCalled = true;
                tryEnd();
        });

        process.nextTick(function () {
                opts.reader.resume();
        });
}

Db.prototype.getAllMls = function (cb) {
        assert.func(cb, 'cb');

        var self = this;

        var sql = 'SELECT * FROM mls';
        self.db.all(sql, cb);
}

Db.prototype.getMlsColumns = function (cb) {
        assert.func(cb, 'cb');

        var self = this;
        var sql = 'pragma table_info(mls)';
        self.db.all(sql, function (err, res) {
                if (err) {
                        cb(err);
                        return;
                }
                cb(null, res.map(function (r) {
                        return r.name;
                }));
        });
}

///--- Joins

Db.prototype.getJoinedMember = function (id, cb) {
        assert.string(id, 'id');
        assert.func(cb, 'cb');

        var self = this;

        var sql = 'SELECT * FROM mls, members WHERE ' +
                'mls.recordNumber = members.id AND members.id = $id';
        var bind = { $id: id };
        self.db.get(sql, bind, cb);
}

Db.prototype.searchMls = function (opts, cb) {
        assert.object(opts);
        assert.string(opts.field);
        assert.string(opts.term);

        var self = this;

        self.getMlsColumns(function (err, res) {
                if (err) {
                        cb(err);
                        return;
                }
                if (res.indexOf(opts.field) === -1) {
                        cb(new Error('invalid search field'));
                        return;
                }
                var sql = 'SELECT * FROM mls, members WHERE ' +
                        'mls.recordNumber = members.id AND ' +
                        'mls.' + opts.field + ' like $term ' +
                        'ORDER BY mls.recordNumber';
                var bind = {
                        $term: '%' + opts.term + '%'
                }
                self.db.all(sql, bind, cb);
        });

}
