'use strict';

/**
 * Create descriptor data object
 * @param {Object} transaction - current transaction
 * @returns {Object}
 * @throws {Error}
 */
function Descriptor(transaction) {
    var lineItemCtnr = transaction.order;
    var result = {};
    if (transaction.getSitePreference('addDescriptorToRequest')) {
        var StringUtils = require('dw/util/StringUtils');
        var orderNo;
        if (Object.prototype.hasOwnProperty.call(lineItemCtnr.custom, 'paymentGatewayReservedOrderNo')) {
            orderNo = lineItemCtnr.custom.paymentGatewayReservedOrderNo;
        } else if (lineItemCtnr instanceof dw.order.Order) {
            orderNo = lineItemCtnr.orderNo;
        } else {
            throw new Error('No orderNo provided for creating descriptor!');
        }
        result.descriptor = StringUtils.format(
            '{0} {1}',
            String(transaction.getSitePreference('paymentGatewayShopName')).substr(0, 9),
            orderNo
        );
    }
    return result;
}

module.exports = Descriptor;
