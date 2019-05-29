'use strict';

/* Script includes */
var server = require('server');

/* Extend Checkout-BeginrRoute */
var Checkout = module.superModule;
server.extend(Checkout);

server.append(
    'Begin',
    server.middleware.https,
    function (req, res, next) {
        var pgError = req.session.privacyCache.get('pgPlaceOrderError');
        if (pgError) {
            res.setViewData({
                paymentGatewayError: pgError
            });
            req.session.privacyCache.set('pgPlaceOrderError', null);
        }
        next();
    }
);

module.exports = server.exports();
