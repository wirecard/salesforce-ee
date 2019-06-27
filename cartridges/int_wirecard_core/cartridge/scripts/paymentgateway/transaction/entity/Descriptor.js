/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var paymentHelper = require('int_wirecard_core/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');

/**
 * Create descriptor data object
 * @param {Object} transaction - current transaction
 * @returns {Object}
 */
function Descriptor(transaction) {
    var order = transaction.order;
    var result = {};
    if ((transaction.paymentMethodID && transaction.paymentMethodID === paymentHelper.PAYMENT_METHOD_SOFORT)
        || transaction.getSitePreference('addDescriptorToRequest')
    ) {
        var StringUtils = require('dw/util/StringUtils');
        result.descriptor = StringUtils.format(
            '{0} {1}',
            String(transaction.getSitePreference('paymentGatewayShopName')).substr(0, 9),
            order.orderNo
        ).replace(/[^a-zA-Z0-9+,-.äöüÄÖÜ\s]/g, '');
    }
    return result;
}

module.exports = Descriptor;
