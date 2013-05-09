var restify = require('restify');
var util = require('util');

function NotImplementedError(message) {
        restify.RestError.call(this, {
                restCode: 'NotImplementedError',
                statusCode: 501,
                message: message || 'not implemented',
                constructorOpt: NotImplementedError
        });
        this.name = 'NotImplementedError';
};
util.inherits(NotImplementedError, restify.RestError);

module.exports = {
        'NotImplementedError': NotImplementedError
};
