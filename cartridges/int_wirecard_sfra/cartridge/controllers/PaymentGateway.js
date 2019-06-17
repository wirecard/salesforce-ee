/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/**
 * Holds actions for redirect logic
 * @module controllers/PaymentGateway
 */

/* API Includes */
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');

/* Script includes */
var server = require('server');

/**
 * Handles re-entry from wpg
 */
server.use(
    'Success',
    server.middleware.https,
    function (req, res, next) {
        var params = req.querystring;
        var orderNo = params.orderNo;
        var orderToken = params.orderSec;

        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(orderNo);

        if (order && order.orderToken === orderToken) {
            // Reset usingMultiShip after successful Order placement
            req.session.privacyCache.set('usingMultiShipping', false);

            res.redirect(
                URLUtils.https('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken)
            );
        } else {
            // TODO show meaningful error message
            req.session.privacyCache.set('pgPlaceOrderError', Resource.msg('error.technical', 'checkout', null));
            res.redirect(URLUtils.https('Cart-Show'));
        }
        return next();
    }
);

/**
 * Cancel redirect from payment gateway
 */
server.get(
    'Cancel',
    server.middleware.https,
    function (req, res, next) {
        var params = req.querystring;
        var orderNo = params.orderNo;
        var orderToken = params.orderSec;

        var OrderMgr = require('dw/order/OrderMgr');
        var Transaction = require('dw/system/Transaction');
        var order = OrderMgr.getOrder(orderNo);

        if (order && order.orderToken === orderToken) {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order);
            });

            req.session.privacyCache.set(
                'pgPlaceOrderError',
                Resource.msg('order.cancellation.byCustomer', 'paymentgateway', null)
            );
            res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment'));
        } else {
            res.redirect(URLUtils.https('Cart-Show'));
        }
        next();
    }
);

/**
 * Cancel redirect from payment gateway
 */
server.get(
    'Fail',
    server.middleware.https,
    function (req, res, next) {
        var params = req.querystring;
        var orderNo = params.orderNo;
        var orderToken = params.orderSec;

        var OrderMgr = require('dw/order/OrderMgr');
        var Transaction = require('dw/system/Transaction');
        var order = OrderMgr.getOrder(orderNo);

        if (order && order.orderToken === orderToken) {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order);
            });

            req.session.privacyCache.set(
                'pgPlaceOrderError',
                Resource.msg('payment_failed_text', 'paymentgateway', null)
            );
            res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment'));
        } else {
            res.redirect(URLUtils.https('Cart-Show'));
        }
        next();
    }
);

/**
 * Handles incoming notifications
 */
server.post(
    'Notify',
    server.middleware.https,
    function (req, res, next) {
        var parameterMap = req.querystring;
        var orderNo = parameterMap.orderNo;
        var orderToken = parameterMap.orderSec;

        var OrderMgr = require('dw/order/OrderMgr');
        var Transaction = require('dw/system/Transaction');
        var order = OrderMgr.getOrder(orderNo);

        if (order && order.orderToken === orderToken) {
            // parse response
            var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
            var notifyData = transactionHelper.parseTransactionResponse(
                req.body, null, transactionHelper.RESPONSE_TYPE_NOTIFY
            );
            var rawResponeJson = transactionHelper.getJsonSignedResponseWrapper(req.body).getJsonResponse();
            require('*/cartridge/scripts/paymentgateway/transaction/Logger').log(rawResponeJson, 'notify');

            if (Object.prototype.hasOwnProperty.call(notifyData, 'transactionId')) {
                var CustomObjectMgr = require('dw/object/CustomObjectMgr');
                Transaction.begin();
                // save notification as custom object
                var customObj = CustomObjectMgr.getCustomObject('PaymentGatewayNotification', notifyData.transactionId);
                if (!customObj) {
                    customObj = CustomObjectMgr.createCustomObject('PaymentGatewayNotification', notifyData.transactionId);
                }
                customObj.custom.responseText = JSON.stringify(rawResponeJson);
                customObj.custom.transactionData = JSON.stringify(notifyData);
                customObj.custom.transactionType = notifyData.transactionType;
                customObj.custom.requestedAmount = notifyData.requestedAmount.value;
                customObj.custom.merchantAccountId = notifyData.merchantAccountId;
                customObj.custom.transactionState = notifyData.transactionState;
                customObj.custom.parentTransactionId = notifyData.parentTransactionId;
                customObj.custom.orderNo = order.orderNo;
                Transaction.commit();
            }
        }

        res.render('paymentgateway/empty');
        return next();
    }
);

/**
 * Debug order transaction
 *
 * Possible request params:
 *  - orderNo String order to calculate request object for -> *required*
 *
 * e.g. PaymentGateway-Debug?orderNo=00018001
 *
 */
server.get(
    'Debug',
    server.middleware.https,
    function (req, res, next) {
        var result = {};
        var OrderMgr = require('dw/order/OrderMgr');

        // use only on test environment
        var System = require('dw/system/System');
        if ([System.PRODUCTION_SYSTEM, System.STAGING_SYSTEM].indexOf(System.instanceType) !== -1) {
            res.setStatusCode(404);
            res.render('error');
            return next();
        }
        var params = req.querystring;

        // load order
        var order = OrderMgr.getOrder(params.orderNo);

        if (order) {
            var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
            var paymentData = orderHelper.getPaymentGatewayOrderPayment(order);

            if (paymentData.paymentMethodID) {
                var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
                var transaction = transactionHelper.getTransaction(paymentData.paymentMethodID.trim(), order);
                result = transaction.getPayload();
            }
        }
        res.render('paymentgateway/json', { json: result });
        return next();
    }
);

server.get(
    'GetPGSummary',
    server.middleware.https,
    function (req, res, next) {
        var paymentMethod = req.querystring.paymentMethod;
        var instruments = require('dw/order/BasketMgr').getCurrentBasket().getPaymentInstruments(paymentMethod);

        if (!instruments.empty && paymentMethod === 'PG_SEPA') {
            res.render('checkout/billing/paymentOptions/paymentOptionsSummary/' + req.querystring.paymentMethod, { payment: instruments[0] });
        } else {
            res.render('paymentgateway/empty');
        }
        return next();
    }
);

module.exports = server.exports();
