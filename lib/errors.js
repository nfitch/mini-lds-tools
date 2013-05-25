var restify = require('restify');
var util = require('util');

function BadRequestError(message) {
        restify.RestError.call(this, {
                restCode: 'BadRequestError',
                statusCode: 400,
                message: message || 'bad request',
                constructorOpt: BadRequestError
        });
        this.name = 'BadRequestError';
};
util.inherits(BadRequestError, restify.RestError);

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
        'BadRequestError': BadRequestError,
        'NotImplementedError': NotImplementedError
};
