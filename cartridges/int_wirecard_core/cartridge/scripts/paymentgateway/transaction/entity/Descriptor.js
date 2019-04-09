'use strict';

var AbstractEntity = require('./Abstract');

/**
 * Create descriptor data object
 * @param {Object} transaction - current transaction
 * @returns {Object}
 */
function Descriptor(transaction) {
    // FIXME set descriptor for all transaction types?
    var order = transaction.order;
    var result = {};
    if (this.getSitePreference('paymentGatewayAddDescriptorToRequest')) {
        var StringUtils = require('dw/util/StringUtils');
        result.descriptor = StringUtils.format(
            '{0} {1}',
            String(this.getSitePreference('paymentGatewayShopName')).substr(0, 9),
            order.orderNo
        );
    }
    return result;
}

Descriptor.prototype = Object.create(AbstractEntity.prototype);

module.exports = Descriptor;
