var assert = require('assert-plus');
var bunyan = require('bunyan');
var db = require('./db');
var errors = require('./errors');
var events = require('events');
var restify = require('restify');
var restifyLib = require('./restify');
var util = require('util');
var vasync = require('vasync');

function Server(opts, log) {
        assert.object(opts, 'opts');
        assert.string(opts.dbFile, 'opts.dbFile');
        assert.string(opts.staticDirectory, 'opts.staticDirectory');
        assert.number(opts.port, 'opts.port');

        assert.optionalObject(log, 'log');

        if (!log) {
                log = bunyan.createLogger({
                        name: 'mini-lds-tools.Server',
                        stream: process.stdout,
                        level: 'info'
                });
        }

        var self = this;
        self.log = log;

        vasync.pipeline({
                funcs: [
                        function (_, cb) {
                                self.db = new db.Db({
                                        'fileName': opts.dbFile,
                                        'log': self.log
                                });

                                self.db.on('error', function (err) {
                                        cb(err);
                                });

                                self.db.on('ready', function () {
                                        cb();
                                });
                        },
                        function (_, cb) {
                                self.server = setupServer.call(self, opts, log);
                                self.server.listen(opts.port);
                                cb();
                        }
                ]
        }, function (err) {
                if (err) {
                        self.emit('error', err);
                } else {
                        self.emit('ready');
                }
        });
}

util.inherits(Server, events.EventEmitter);
exports.Server = Server;

//--- Server

function setupServer(opts, log) {
        var self = this;
        var ie = new restify.errors.InternalError();

        var server = restify.createServer({
                name: opts.name,
                log: opts.log
        });

        server.use(restifyLib.userLookup({ db: self.db }));

        server.get('/fields', function (req, res, next) {
                self.db.getMlsColumns(function (err, columns) {
                        if (err) {
                                return (next(ie));
                        }
                        self.log.info(columns, 'columns');
                        res.send(columns);
                        return next();
                });
        });

        server.get('/members/:id', function (req, res, next) {
                var id = req.params.id;
                next(new errors.NotImplementedError());
        });

        //Always keep static catchall serving last
        server.get(/\/.*/, restify.serveStatic({
                'directory': opts.staticDirectory
        }));

        server.on('after', restify.auditLogger({
                log: bunyan.createLogger({
                        name: 'audit',
                        stream: process.stdout
                })
        }));

        return server;
}
