'use strict';

var URLUtils = require('dw/web/URLUtils');

/**
 * Create notification url
 * @param {dw.order.Basket} basket - current basket
 * @param {string} route - controller/action
 * @returns {string} redirect url as string
 */
function getUrl(basket, route) {
    var url = URLUtils.https(route);
    url.append('orderNo', basket.custom.paymentGatewayReservedOrderNo);
    return url.toString();
}

/**
 * Transaction notification url
 * @param {dw.order.Basket} basket - current basket
 * @returns {Object} - object with notification url & format
 */
function NotificationUrl(basket) {
    var result = {
        notification_transaction_url: getUrl(basket, 'PaymentGatewayCredit-Notify'),
        notifications_format: 'application/json'
    };
    return result;
}

module.exports = NotificationUrl;
