'use strict';

/**
 * Retrieve payment gateway payment instrument data from dw.order.Order
 * @param {dw.order.Order}
 * @returns {Object}
 */
exports.getPaymentGatewayOrderPayment = function (order) {
    var result = { paymentMethodID: '' };

    var paymentInstruments = order.paymentInstruments.iterator();
    while (paymentInstruments.hasNext()) {
        var instrument = paymentInstruments.next();
        if (instrument.getPaymentMethod().indexOf('PG', 0) > -1) {
            result.paymentMethodID = instrument.getPaymentMethod();
            result.paymentInstrument = instrument;
        }
    }
    return result;
};

/**
 * Calculate fingerprint with order parameters and merchant secret
 * @param {dw.order.Order}
 * @returns {string}
 */
exports.getOrderFingerprint = function (order) {
    var Mac = require('dw/crypto/Mac');
    var Site = require('dw/system/Site').getCurrent();
    var secret = Site.getCustomPreferenceValue('paymentGatewayUrlSalt');
    var hashParams = [order.orderNo];

    /* product line item data */
    var plis = order.getAllProductLineItems();
    var plisIterator = plis.iterator();
    while (plisIterator.hasNext()) {
        var pli = plisIterator.next();
        hashParams.push(pli.productID);
        hashParams.push(pli.quantity.value);
    }

    /* customer data */
    hashParams.push(order.customerEmail);
    hashParams.push(order.remoteHost);
    var billingAddress = order.getBillingAddress();
    hashParams.push(billingAddress.getLastName());
    hashParams.push(billingAddress.getFirstName());
    hashParams.push(billingAddress.getAddress1());
    hashParams.push(billingAddress.getPostalCode());
    hashParams.push(billingAddress.getCity());

    var mac = new Mac(Mac.HMAC_SHA_512);
    var digest = mac.digest(hashParams.join('|'), secret);
    return require('dw/crypto/Encoding').toHex(digest);
};
