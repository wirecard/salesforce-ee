'use strict';

/**
 * Holds actions for redirect logic
 * @module controllers/PaymentGateway
 */

/* Script includes */
var server = require('server');

var URLUtils = require('dw/web/URLUtils');

/**
 * Fetch request data to render seamless form
 */
server.get(
    'RequestData',
    server.middleware.https,
    function (req, res, next) {
        var BasketMgr = require('dw/order/BasketMgr');
        var HookMgr = require('dw/system/HookMgr');
        var Locale = require('dw/util/Locale');
        var OrderMgr = require('dw/order/OrderMgr');
        var Transaction = require('dw/system/Transaction');

        var currentBasket = BasketMgr.getCurrentBasket();
        var orderNo = currentBasket.custom.paymentGatewayReservedOrderNo;
        if (!orderNo) {
            Transaction.wrap(function () {
                orderNo = OrderMgr.createOrderNo();
                currentBasket.custom.paymentGatewayReservedOrderNo = orderNo;
            });
        }

        // locale
        var locale = 'en'; // fallback
        var currentLocale = Locale.getLocale(req.locale.id);
        if (Object.prototype.hasOwnProperty.call(currentLocale, 'language')) {
            locale = currentLocale.language;
        }
        var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
        var params = {
            orderNo: orderNo,
            locale: locale,
            remoteHost: req.remoteAddress,
            customFields: [
                { name: 'fp', value: orderHelper.getOrderFingerprint(currentBasket, orderNo) }
            ]
        };
        // set payment method PG_CREDITCARD
        var result = HookMgr.callHook('app.payment.processor.paymentgateway_creditcard',
            'Handle',
            currentBasket,
            { paymentMethodID: 'PG_CREDITCARD' });
        if (result.success) {
            var transaction = new (require('*/cartridge/scripts/paymentgateway/transaction/PG_CREDITCARD_REQUESTDATA'))(currentBasket, params);
            res.render('paymentgateway/json', { json: transaction.getPayload() });
        } else {
            res.setStatusCode(404);
        }
        next();
    }
);

/**
 * Re-entry point after 3DS authentication
 */
server.use(
    'TermUrl',
    server.middleware.https,
    function (req, res, next) {
        var parameterMap = req.querystring;
        var orderNo = parameterMap.orderNo;

        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(orderNo);

        var result;
        // TODO verify request integrity (signed-json / xmlsig)
        if (order) {
            result = {
                error: false,
                orderID: order.orderNo,
                orderToken: order.orderToken,
                continueUrl: URLUtils.url('Order-Confirm').toString()
            };
        } else {
            result = {
                error: true,
                errorMessage: '3d-Secure authentication failed!'
            };
        }
        res.render('paymentgateway/json', { json: result });
        next();
    }
);

/**
 * Save transaction data after seamless form was submitted
 */
server.post(
    'SaveTransaction',
    server.middleware.https,
    function (req, res, next) {
        var result;
        var parameterMap = req.querystring;
        var formData = req.form;
        var orderNo = parameterMap.orderNo;
        var transactionData = JSON.parse(formData.transactionData);

        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(orderNo);
        if (order && transactionData) {
            // save transaction data with order
            var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
            transactionHelper.saveSeamlessTransactionToOrder(order, transactionData);
            req.session.privacyCache.set('usingMultiShipping', false);

            result = {
                error: false,
                orderID: order.orderNo,
                orderToken: order.orderToken,
                continueUrl: URLUtils.url('Order-Confirm').toString()
            };
        } else {
            result = {
                error: true,
                errorMessage: 'Error while saving transaction to order!'
            };
        }
        res.render('paymentgateway/json', { json: result });
        next();
    }
);

/**
 * Restore basket / fail order
 */
server.post(
    'RestoreBasket',
    server.middleware.https,
    function (req, res, next) {
        var parameterMap = req.querystring;
        var orderNo = parameterMap.orderNo;

        var result = {
            redirectUrl: URLUtils.url('Cart-Show').toString()
        };
        try {
            var OrderMgr = require('dw/order/OrderMgr');
            var order = OrderMgr.getOrder(orderNo);
            if (order) {
                var Transaction = require('dw/system/Transaction');
                Transaction.wrap(function () {
                    OrderMgr.failOrder(order);
                });
                var BasketMgr = require('dw/order/BasketMgr');
                var currentBasket = BasketMgr.getCurrentBasket();
                if (currentBasket) {
                    Transaction.wrap(function () {
                        delete currentBasket.custom.paymentGatewayReservedOrderNo;
                    });
                }
                result.success = 1;
            }
        } catch (err) {
            var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');
            pgLogger.error('Error while restoring basket: \n'
               + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        res.render('paymentgateway/json', { json: result });
        next();
    }
);

/**
 * Handles incoming notifications for seamless integrated payment methods (credit card)
 */
server.post(
    'Notify',
    server.middleware.https,
    function (req, res, next) {
        var parameterMap = req.querystring;
        var orderNo = parameterMap.orderNo;

        var OrderMgr = require('dw/order/OrderMgr');
        var Transaction = require('dw/system/Transaction');
        var order = OrderMgr.getOrder(orderNo);

        if (order) {
            // parse response
            var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
            var notifyData = transactionHelper.parseTransactionResponse(req.body, null);
            require('*/cartridge/scripts/paymentgateway/transaction/Logger').log(JSON.parse(req.body), 'notify');

            // check fingerprint
            var fp;
            var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
            if (Object.prototype.hasOwnProperty.call(notifyData, 'customFields')
                && Object.prototype.hasOwnProperty.call(notifyData.customFields, 'fp')
            ) {
                fp = notifyData.customFields.fp;
            }
            if (fp === orderHelper.getOrderFingerprint(order)) {
                var CustomObjectMgr = require('dw/object/CustomObjectMgr');
                // save notification as custom object
                var customObj = CustomObjectMgr.getCustomObject('PaymentGatewayNotification', notifyData.transactionId);
                Transaction.begin();
                if (!customObj) {
                    customObj = CustomObjectMgr.createCustomObject('PaymentGatewayNotification', notifyData.transactionId);
                }
                customObj.custom.responseText = req.body;
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


module.exports = server.exports();
