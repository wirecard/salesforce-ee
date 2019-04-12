'use strict';

/**
 * Create account-holder data object
 * @param {Object} transaction - current transaction
 * @returns {Object}
 */
function BillingAddress(transaction) {
    var order = transaction.order;
    var billingAddress = order.getBillingAddress();

    var result = {
        'first-name': billingAddress.firstName,
        'last-name': billingAddress.lastName,
        email: order.customerEmail
    };
    var extraFields = {
        phone: billingAddress.phone || '',
        address: {
            street1: billingAddress.address1,
            city: billingAddress.city,
            'postal-code': billingAddress.postalCode,
            state: billingAddress.getStateCode(),
            country: billingAddress.getCountryCode().value
        }
    };
    Object.keys(extraFields).forEach(function (key) {
        result[key] = extraFields[key];
    });

    return result;
}

module.exports = BillingAddress;
