'use strict';

/**
 * Create shipping address data object
 * @param {Object} transaction - current transaction
 * @returns {Object}
 */
function ShippingAddress(transaction) {
    // FIXME set shipping address for all transaction types?
    var order = transaction.order;
    var shippingAddress = order.defaultShipment.shippingAddress;
    var result = {
        'first-name': shippingAddress.getFirstName(),
        'last-name': shippingAddress.getLastName(),
        address: {
            country: shippingAddress.getCountryCode().value,
            street1: shippingAddress.getAddress1(),
            city: shippingAddress.getCity(),
            'postal-code': shippingAddress.getPostalCode()
        }
    };
    return result;
}

module.exports = ShippingAddress;
