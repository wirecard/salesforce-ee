/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/* API includes */
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

/**
 * Deletes archived notification custom objects
 * @param {Object}
 * @returns {dw.system.Status}
 */
exports.execute = function () {
    var notifications = CustomObjectMgr.getAllCustomObjects('PaymentGatewayProcessedNotification');
    while (notifications.hasNext()) {
        var notification = notifications.next();
        CustomObjectMgr.remove(notification);
    }
    return PIPELET_NEXT;
};
