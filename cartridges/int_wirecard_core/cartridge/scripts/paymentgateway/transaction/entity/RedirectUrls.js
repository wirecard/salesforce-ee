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
 * @param {dw.order.Order} order - current order
 * @returns {Object} - object with success, cancel, notification urls
 */
function RedirectUrls(order) {
    var result = {};
    result['success-redirect-url'] = getRedirectUrl(order, 'PaymentGateway-Success');
    result['cancel-redirect-url'] = getRedirectUrl(order, 'PaymentGateway-Cancel');
    result['fail-redirect-url'] = getRedirectUrl(order, 'PaymentGateway-Fail');

    let format = 'application/json';

    if (require('dw/system/Site').getCurrent().getCustomPreferenceValue('paymentGatewaySignResponses')) {
        format += '-signed';
    }
    result.notifications = {
        format: format,
        notification: [{
            url: getRedirectUrl(order, 'PaymentGateway-Notify')
        }]
    };
    return result;
}

module.exports = RedirectUrls;
