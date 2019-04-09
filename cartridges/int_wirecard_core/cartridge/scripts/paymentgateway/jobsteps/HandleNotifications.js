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
            pgLogger.error('Error while processing notification for transaction #' + notification.custom.transactionId
                + '\n' + err.fileName + ': ' + err.message + '\n' + err.stack);
        } finally {
            // archive notification
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

            var processingAttempts = notification.custom.processingAttempts ? parseInt(notification.custom.processingAttempts, 10) : 0;
            var maxProcessingAttempts = pdict.MaxProcessingAttempts ? parseInt(pdict.MaxProcessingAttempts, 10) : 0;
            if (errorMessage && maxProcessingAttempts < processingAttempts) {
                notification.custom.processingAttempts = processingAttempts + 1;
            }
            if (!errorMessage || maxProcessingAttempts >= processingAttempts) {
                // delete original notification
                CustomObjectMgr.remove(notification);
            }
            Transaction.commit();
        }
    }
    return PIPELET_NEXT;
};
