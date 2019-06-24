/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/* API includes */
var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var HookMgr = require('dw/system/HookMgr');
var StringUtils = require('dw/util/StringUtils');
var Transaction = require('dw/system/Transaction');

/* script includes */
var stringHelper = require('*/cartridge/scripts/paymentgateway/util/StringHelper');

/**
 * Prepend "0" to date values
 * @param {string} str - date value (e.g. month, day)
 * @returns {string} - string with prepended "0"
 */
function prependLeadingZero(str) {
    return stringHelper.padLeft(str, 2, '0');
}

/**
 * Creates custom object PaymentGatewayProcessedNotification for processed notification
 * @param {dw.object.CustomObject} notification - notification object
 * @param {string} errorMessage - message when notification processing causes system failure
 */
function archiveProcessedNotification(notification, errorMessage) {
    Transaction.begin();
    var now = new Date();
    var processedNotification = CustomObjectMgr.createCustomObject(
        'PaymentGatewayProcessedNotification',
        [
            notification.custom.transactionId,
            '_' + now.getFullYear(),
            prependLeadingZero(now.getMonth() + 1),
            prependLeadingZero(now.getDate()),
            '-' + prependLeadingZero(now.getHours()),
            prependLeadingZero(now.getMinutes()),
            prependLeadingZero(now.getMilliseconds())
        ].join('')
    );
    processedNotification.custom.systemErrorMessage = errorMessage || '';
    processedNotification.custom.transactionData = notification.custom.transactionData;
    processedNotification.custom.transactionType = notification.custom.transactionType;
    processedNotification.custom.orderNo = notification.custom.orderNo;
    Transaction.commit();
}

/**
 * Save credit card in customer wallet
 * @param {dw.object.CustomObject} notification - custom object holding credit card token
 */
function saveCustomerPaymentInstrument(notification) {
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(notification.custom.orderNo);

    if (order) {
        var customer = order.getCustomer();
        var orderPaymentInstruments = order.getPaymentInstruments('PG_CREDITCARD');
        if (orderPaymentInstruments.length === 1 && orderPaymentInstruments[0].custom.paymentGatewaySaveCCToken) {
            var notificationRaw = JSON.parse(notification.custom.responseText);
            if (customer.isRegistered()
                && Object.prototype.hasOwnProperty.call(notificationRaw, 'payment')
                && Object.prototype.hasOwnProperty.call(notificationRaw.payment, 'card-token')
            ) {
                var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');

                // set new credit card data
                var billingAddress = order.getBillingAddress();
                var shippingAddressHash = null;
                if (order.shipments.length > 0) {
                    shippingAddressHash = orderHelper.getAddressHash(order.shipments[0].shippingAddress);
                }
                var newCCData = {
                    token: String(notificationRaw.payment['card-token']['token-id']),
                    masked: String(notificationRaw.payment['card-token']['masked-account-number']),
                    accountHolder: billingAddress.getFirstName() + ' ' + billingAddress.getLastName(),
                    billingAddressHash: orderHelper.getAddressHash(billingAddress),
                    shippingAddressHash: shippingAddressHash,
                    lastUsed: new Date()
                };
                var wallet = customer.getProfile().getWallet();
                var paymentInstruments = wallet.getPaymentInstruments();
                // check for duplicate
                var isDuplicateCard = false;
                var oldCard;
                for (var i = 0; i < paymentInstruments.length; i++) {
                    var card = paymentInstruments[i];
                    if (card.creditCardToken === newCCData.token) {
                        isDuplicateCard = true;
                        oldCard = card;
                        break;
                    }
                }
                // create new customer payment instrument
                Transaction.wrap(function () {
                    var newCC = wallet.createPaymentInstrument('PG_CREDITCARD');
                    newCC.setCreditCardType('credit'); // default value - if not set, method getCustomerPaymentInstruments in account model will fail
                    newCC.setCreditCardHolder(newCCData.accountHolder); // default value - if not set, method getCustomerPaymentInstruments in account model will fail
                    newCC.custom.paymentGatewayMaskedAccountNumber = newCCData.masked;
                    newCC.custom.paymentGatewayBillingAddressHash = newCCData.billingAddressHash;
                    newCC.custom.paymentGatewayShippingAddressHash = newCCData.shippingAddressHash;
                    newCC.custom.paymentGatewayLastUsed = newCCData.lastUsed;
                    newCC.creditCardToken = newCCData.token;
                });

                if (isDuplicateCard) {
                    Transaction.wrap(function () {
                        wallet.removePaymentInstrument(oldCard);
                    });
                }
            }
        }
    }
}

/**
 * Handles stored notification custom objects
 * @param {Object}
 * @returns {Number}
 */
exports.execute = function (pdict) {
    var notifications = CustomObjectMgr.getAllCustomObjects('PaymentGatewayNotification');
    while (notifications.hasNext()) {
        var notification = notifications.next();
        var errorMessage;
        try {
            HookMgr.callHook('int.wirecard.handlenotify', 'process', notification);
            pgLogger.info(
                StringUtils.format(
                    'Successfully processed notification for order: {0} / transaction: {1} ({2})',
                    notification.custom.orderNo,
                    notification.custom.transactionId,
                    notification.custom.transactionType
                )
            );

            // save credit card for later use
            saveCustomerPaymentInstrument(notification);
        } catch (err) {
            errorMessage = err.message;
            pgLogger.error('Error while processing notification for transaction ' + notification.custom.transactionId
                + '\n' + err.fileName + ': ' + err.message + '\n' + err.stack);
        } finally {
            // archive notification
            archiveProcessedNotification(notification, errorMessage);

            // store failed processing attempts to notification
            var processingAttempts = notification.custom.processingAttempts ? parseInt(notification.custom.processingAttempts, 10) : 0;
            var maxProcessingAttempts = pdict.MaxProcessingAttempts ? parseInt(pdict.MaxProcessingAttempts, 10) : 0;
            if (errorMessage && maxProcessingAttempts < processingAttempts) {
                Transaction.wrap(function () { // eslint-disable-line no-loop-func
                    notification.custom.processingAttempts = processingAttempts + 1;
                });
            }
            // delete notification after successful processing or if max number of possible failed attempts is reached
            if (!errorMessage || maxProcessingAttempts >= processingAttempts) {
                Transaction.wrap(function () { // eslint-disable-line no-loop-func
                    CustomObjectMgr.remove(notification);
                });
            }
        }
    }
    return PIPELET_NEXT;
};
