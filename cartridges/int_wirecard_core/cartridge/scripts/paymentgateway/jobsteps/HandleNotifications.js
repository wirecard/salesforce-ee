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
