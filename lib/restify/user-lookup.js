var assert = require('assert-plus');
var errors = require('../errors');

///--- API

/**
 * Looks up a user, rejects the request if the user is not present or known.
 *
 * TODO: we should really just keep a cache of all users and reload every
 * 5 minutes.  Doing this each time is really wasteful.
 */
function userLookup(opts) {
        assert.object(opts, 'opts');
        assert.object(opts.db, 'opts.db');

        var db = opts.db;

        function lookup(req, res, next) {
                var uerror = new errors.BadRequestError('user unknown');
                if (!req.headers['x-user-name']) {
                        return (next(uerror));
                }

                var log = req.log;
                var username = req.headers['x-user-name'];

                db.getUser(username, function (err, user) {
                        if (err) {
                                return (next(uerror));
                        }

                        req.user = user;
                        return (next());
                });

        }

        return (lookup);
}

module.exports = userLookup;
