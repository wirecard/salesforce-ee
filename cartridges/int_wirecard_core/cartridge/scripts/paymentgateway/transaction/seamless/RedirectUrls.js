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
    var routes = {
        cancel : 'PaymentGatewayCredit-Cancel',
        fail   : 'PaymentGatewayCredit-Fail',
        success: 'PaymentGatewayCredit-Success',
        termUrl: 'PaymentGatewayCredit-TermUrl'
    };
    if (Object.prototype.hasOwnProperty.call(transaction, 'redirectRoutes')) {
        Object.keys(transaction.redirectRoutes).forEach(function (key) {
            routes[key] = transaction.redirectRoutes[key];
        });
    }
    if (transaction.is3DSecure) {
        result.success_redirect_url = getUrl(basket, routes.termUrl);
    } else {
        result.success_redirect_url = getUrl(basket, routes.success);
    }
    result.fail_redirect_url = getUrl(basket, routes.fail);
    result.cancel_redirect_url = getUrl(basket, routes.cancel);
    return result;
}

module.exports = RedirectUrls;
