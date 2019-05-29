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

    var format = 'application/json';
    if (require('dw/system/Site').getCurrent().getCustomPreferenceValue('paymentGatewaySignResponses')) {
        format += '-signed';
    }

    var result = {
        notification_url_1: getUrl(basket, 'PaymentGatewayCredit-Notify'),
        notifications_format: format
    };
    var mailto = transaction.getSitePreference('paymentGatewayNotificationEmail');
    if (mailto) {
        result.notification_url_2 = 'mailto:' + mailto;
    }

    var routes = {
        cancel: 'PaymentGatewayCredit-Cancel',
        fail: 'PaymentGatewayCredit-Fail',
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
