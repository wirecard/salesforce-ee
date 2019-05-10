'use strict';

/**
 * Create descriptor data object
 * @param {Object} transaction - current transaction
 * @returns {Object}
 */
function Descriptor(transaction) {
    var basket = transaction.order;
    var result = {};
    if (transaction.getSitePreference('addDescriptorToRequest')) {
        var StringUtils = require('dw/util/StringUtils');
        result.descriptor = StringUtils.format(
            '{0} {1}',
            String(transaction.getSitePreference('paymentGatewayShopName')).substr(0, 9),
            basket.custom.paymentGatewayReservedOrderNo
        );
    }
    return result;
}

module.exports = Descriptor;
