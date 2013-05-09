#!/usr/bin/node

var bunyan = require('bunyan');
var errors = require('./lib/errors');
var restify = require('restify');

var NAME = 'mini-lds-tools';

var log = bunyan.createLogger({
        name: NAME,
        stream: process.stdout,
        level: 'info'
});

//--- Server

var server = restify.createServer({
        name: NAME,
        log: log
});

server.get('/m/:id', function (req, res, next) {
        var id = req.params.id;
        next(new errors.NotImplementedError());
});

//Always keep static catchall serving last
server.get(/\/.*/, restify.serveStatic({
        'directory': './static'
}));

server.on('after', restify.auditLogger({
        log: bunyan.createLogger({
                name: 'audit',
                stream: process.stdout
        })
}));

//--- Main

server.listen(8080);
