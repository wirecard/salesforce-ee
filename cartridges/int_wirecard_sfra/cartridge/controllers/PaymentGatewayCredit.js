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

/* Script includes */
var server = require('server');

var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site').getCurrent();
var URLUtils = require('dw/web/URLUtils');

/**
 * Helper function to fetch fingerprint value from form data
 * @param {dw.util.List} formData - as provided by req.form
 * @returns {string} - fingerprint or undefined if not provided
 */
function getFpFromFormData(formData) {
    var fp;
    var fpValueKey;
    Object.keys(formData).forEach(function (k) {
        var tmpValue = formData[k];
        if (/^fp$/.test(tmpValue)) {
            fpValueKey = k.replace(/name/g, 'value');
        }
    });
    if (fpValueKey && Object.prototype.hasOwnProperty.call(formData, fpValueKey)) {
        fp = formData[fpValueKey];
    }
    return fp;
}

/**
 * Helper function to retrieve specific config value
 * @param {string} key - site preference name
 * @returns {string} - site preference value
 */
function getSitePreference(key) {
    var methodKey = key;
    var result = Site.getCustomPreferenceValue(methodKey);
    if (!result) {
        result = '';
    }
    return result;
}

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
                { name: 'fp', value: orderHelper.getOrderFingerprint(currentBasket, orderNo, getSitePreference('paymentGatewayCreditCardSecret')) }
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
 * Re-entry point after non-3DS transaction
 */
server.use(
    'Success',
    server.middleware.https,
    function (req, res, next) {
        var parameterMap = req.querystring;
        var orderNo = parameterMap.orderNo;

        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(orderNo);

        var result;
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
                errorMessage: Resource.msg('error.confirmation.error', 'confirmation', null)
            };
        }
        res.render('paymentgateway/json', { json: result });
        next();
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

        var OrderMgr = require('dw/order/OrderMgr');
        var Transaction = require('dw/system/Transaction');
        var order = OrderMgr.getOrder(orderNo);

        if (order) {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order, true);
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
 * Re-entry point after 3DS authentication
 */
server.post(
    'TermUrl',
    server.middleware.https,
    function (req, res, next) {
        var parameterMap = req.querystring;
        var orderNo = parameterMap.orderNo;

        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(orderNo);

        var fp = getFpFromFormData(req.form);
        var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
        if (order && fp === orderHelper.getOrderFingerprint(order, null, getSitePreference('paymentGatewayCreditCardSecret'))) {
            // Reset usingMultiShip after successful Order placement
            req.session.privacyCache.set('usingMultiShipping', false);

            res.redirect(
                URLUtils.https('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken)
            );
        } else {
            res.redirect(URLUtils.https('Cart-Show'));
        }
        next();
    }
);

/**
 * Fail redirect from payment gateway
 */
server.use(
    'Fail',
    server.middleware.https,
    function (req, res, next) {
        var params = req.querystring;
        var orderNo = params.orderNo;

        var OrderMgr = require('dw/order/OrderMgr');
        var Transaction = require('dw/system/Transaction');
        var order = OrderMgr.getOrder(orderNo);

        var fp = getFpFromFormData(req.form);
        var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
        if (order && fp === orderHelper.getOrderFingerprint(order, null, getSitePreference('paymentGatewayCreditCardSecret'))) {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order, true);
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
            var three3dsParams = {};
            [
                'acs_url',
                'merchant_account_id',
                'nonce3d',
                'pareq',
                'notification_url_1',
                'transaction_type'
            ].forEach(function (k) {
                if (Object.prototype.hasOwnProperty.call(transactionData, k)) {
                    three3dsParams[k] = transactionData[k].replace(/&#47;/g, '/');
                }
            });
            if (Object.keys(three3dsParams).length === 6) {
                result = {
                    acsUrl: three3dsParams.acs_url,
                    pareq: three3dsParams.pareq,
                    termUrl: three3dsParams.notification_url_1,
                    md: [
                        'merchant_account_id=' + three3dsParams.merchant_account_id,
                        'nonce3d=' + three3dsParams.nonce3d,
                        'transaction_type=' + three3dsParams.transaction_type
                    ].join('&')
                };
            } else {
                req.session.privacyCache.set('usingMultiShipping', false);

                result = {
                    error: false,
                    orderID: order.orderNo,
                    orderToken: order.orderToken,
                    continueUrl: URLUtils.url('Order-Confirm').toString()
                };
            }
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
                    OrderMgr.failOrder(order, true);
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
            var ccTransaction = transactionHelper.getTransaction('PG_CREDITCARD_REQUESTDATA', order);
            var paymentMethodID = ccTransaction.is3DSecure ? transactionHelper.PAYMENT_METHOD_ID_CREDIT_CARD3DS : transactionHelper.PAYMENT_METHOD_ID_CREDIT_CARD;

            var notifyData = transactionHelper.parseTransactionResponse(
                req.body, paymentMethodID, transactionHelper.RESPONSE_TYPE_NOTIFY
            );
            var rawResponeJson = transactionHelper.getJsonSignedResponseWrapper(req.body, paymentMethodID).getJsonResponse();
            require('*/cartridge/scripts/paymentgateway/transaction/Logger').log(rawResponeJson, 'notify');

            if (Object.prototype.hasOwnProperty.call(notifyData, 'transactionId')) {
                var CustomObjectMgr = require('dw/object/CustomObjectMgr');
                // save notification as custom object
                var customObj = CustomObjectMgr.getCustomObject('PaymentGatewayNotification', notifyData.transactionId);
                Transaction.begin();
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


module.exports = server.exports();
