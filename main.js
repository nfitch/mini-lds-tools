#!/usr/bin/node

var bunyan = require('bunyan');
var lib = require('./lib');
var fs = require('fs');
var vasync = require('vasync');

var NAME = 'mini-lds-tools';
var PORT = 8080;

var server = null;

//--- Main

var log = bunyan.createLogger({
        name: NAME,
        stream: process.stdout,
        level: 'info'
});

//TODO: Take on the command line
var configFileName = './etc/config.json';

var opts = null;
try {
        opts = JSON.parse(fs.readFileSync(configFileName));
} catch (e) {
        log.fatal({ configFileName: configFileName },
                  'Unable to read file or bad format.');
}
opts.name = NAME;

vasync.pipeline({
        funcs: [
                function (_, cb) {
                        server = new lib.server(opts, log);

                        server.on('error', function (err) {
                                cb(err);
                        });

                        server.on('ready', function () {
                                cb();
                        });
                }
        ]
}, function (err) {
        if (err) {
                log.fatal({
                        err: err,
                        opts: opts
                }, 'Unable to init application.');
                process.exit(1);
        } else {
                log.info(opts, 'Server inited.');
        }
});
