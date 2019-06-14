/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var URLUtils = require('dw/web/URLUtils');

/**
 * Create redirect url
 * @param {dw.order.Order} order - current order
 * @param {string} route - controller/action
 * @returns {string} redirect url as string
 */
function getRedirectUrl(order, route) {
    var url = URLUtils.https(route);
    url.append('orderNo', order.orderNo);
    url.append('orderSec', order.orderToken);
    return url.toString();
}

/**
 * Transaction redirect urls
 * @param {Object} transaction - current transaction
 * @returns {Object} - object with success, cancel, notification urls
 */
function RedirectUrls(transaction) {
    var order = transaction.order;
    var result = {};
    result['success-redirect-url'] = getRedirectUrl(order, 'PaymentGateway-Success');
    result['cancel-redirect-url'] = getRedirectUrl(order, 'PaymentGateway-Cancel');
    result['fail-redirect-url'] = getRedirectUrl(order, 'PaymentGateway-Fail');

    let format = 'application/json-signed';

    result.notifications = {
        format: format,
        notification: [{
            url: getRedirectUrl(order, 'PaymentGateway-Notify')
        }]
    };
    var mailto = transaction.getSitePreference('paymentGatewayNotificationEmail');
    if (mailto) {
        result.notifications.notification.push({
            url: 'mailto:' + mailto
        });
    }
    return result;
}

module.exports = RedirectUrls;
