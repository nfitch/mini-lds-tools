#!/usr/bin/node

var bunyan = require('bunyan');
var fs = require('fs');
var lib = require('../lib');
var optimist = require('optimist');
var vasync = require('vasync');

var options = optimist.options({
        'c': {
                'alias': 'config',
                'default': './etc/config.json',
                'description': 'Config file can define: dbFile'
        },
        'd': {
                'alias': 'dbFile',
                'description': 'Path to sqlite3'
        },
        'e': {
                'alias': 'endpoint',
                'description': 'HTTP Endpoint for login.html'
        },
        'n': {
                'alias': 'name',
                'description': 'Name of the user.'
        },
        's': {
                'alias': 'secret',
                'description': 'Secret for the user.'
        }

});
var argv = options.argv;

var log = bunyan.createLogger({
        name: 'import.js',
        stream: process.stdout,
        level: 'info'
});

var DB = null;
var OK = 'Ok.';

///--- Helpers

function usage(message) {
        if (message) {
                console.log(message);
        }
        console.log('usage: user.js [list|putUser|delUser|listUsers|userUrl] ' +
                    'OPTIONS');
        optimist.showHelp();
        process.exit(2);
}

function constructUrl(endpoint, name, secret) {
        return 'http://' + endpoint + '/login.html#' +
                'name=' + encodeURIComponent(name) + '&' +
                'secret=' + encodeURIComponent(secret);
}

///--- Methods

function delUser(cb) {
        if (!argv.n) {
                usage('delUser requires a name');
        }
        DB.deleteUser(argv.n, function (err) {
                if (err) {
                        console.log(err);
                        return;
                }
                console.log(OK);
                cb();
        });
}

function listUsers(cb) {
        DB.listUsers(function (err, users) {
                if (err) {
                        cb(err);
                        return;
                }
                for (var i = 0; i < users.length; ++i) {
                        console.log(users[i].name);
                }
                cb();
        });
}

function putUser(cb) {
        if (!argv.e || !argv.n || !argv.s) {
                usage('putUser requires endpoint, name, and secret');
        }
        DB.putUser({
                name: argv.n,
                secret: argv.s
        }, function (err) {
                if (err) {
                        console.log(err);
                        return;
                }
                console.log(constructUrl(argv.e, argv.n, argv.s));
                cb();
        });
}

function userUrl(cb) {
        if (!argv.e || !argv.n) {
                usage('putUser requires an endpoint and name');
        }
        DB.getUser(argv.n, function (err, user) {
                if (err) {
                        console.log(err);
                        return;
                }
                console.log(constructUrl(argv.e, argv.n, user.secret));
                cb();
        });

}

var fns = {
        'delUser': delUser,
        'listUsers': listUsers,
        'putUser': putUser,
        'userUrl': userUrl
}

///--- Main

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
                        if (argv._.length !== 1) {
                                usage();
                        }
                        var action = argv._[0];
                        if (action === 'list') {
                                for (var f in fns) {
                                        console.log(f);
                                }
                                cb();
                                return;
                        }
                        if (!fns[action]) {
                                usage('Unknown action: ' + argv._[0]);
                        }
                        fns[action](function (err) {
                                if (err) {
                                        console.error(err);
                                }
                        });
                }

        ]
}, function (err) {
        if (err) {
                console.error(err);
        }
});

