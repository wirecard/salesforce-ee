'use strict';

var URLUtils = require('dw/web/URLUtils');

/**
 * Create redirect urls
 * @param {dw.order.LineItemContainer} lineItemCtnr - either current basket or order
 * @param {string} route - controller/action
 * @returns {string} redirect url as string
 */
function getUrl(lineItemCtnr, route) {
    var url = URLUtils.https(route);
    if (Object.prototype.hasOwnProperty.call(lineItemCtnr.custom, 'paymentGatewayReservedOrderNo')) {
        url.append('orderNo', lineItemCtnr.custom.paymentGatewayReservedOrderNo);
    } else if (lineItemCtnr instanceof dw.order.Order) {
        url.append('orderNo', lineItemCtnr.orderNo);
        url.append('orderSec', lineItemCtnr.orderToken);
    } else {
        throw new Error('No orderNo provided for creating redirect url!');
    }
    return url.toString();
}

/**
 * Transaction redirect urls
 * @param {Object} transaction - current transaction
 * @returns {Object} - object with notification url & format
 */
function RedirectUrls(transaction) {
    var basket = transaction.order;
    var result = {
        notification_transaction_url: getUrl(basket, 'PaymentGatewayCredit-Notify'),
        notifications_format: 'application/json'
    };
    if (Object.prototype.hasOwnProperty.call(transaction, 'appendSuccessUrl')) {
        result.success_redirect_url = getUrl(basket, 'PaymentGatewayCredit-TermUrl');
        result.fail_redirect_url = getUrl(basket, 'PaymentGatewayCredit-Fail');
    }
    return result;
}

module.exports = RedirectUrls;
