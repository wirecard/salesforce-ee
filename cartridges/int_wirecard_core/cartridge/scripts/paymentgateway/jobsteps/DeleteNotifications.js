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
