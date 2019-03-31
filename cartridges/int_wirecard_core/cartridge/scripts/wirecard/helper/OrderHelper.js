'use strict';

/**
 * Retrieve wirecard payment instrument data from dw.order.Order
 *
 * @param {dw.order.Order} order - an instance of dw.order.Order
 * @returns {Object} - containing payment gateway paymentMethodID & paymentInstrument if used for given order
 */
function getWirecardOrderPayment(order) {
    var result = { paymentMethodID: '' };

    var paymentInstruments = order.paymentInstruments.iterator();
    while (paymentInstruments.hasNext()) {
        var instrument = paymentInstruments.next();
        if (instrument.getPaymentMethod().indexOf('WCD', 0) > -1) {
            result.paymentMethodID = instrument.getPaymentMethod();
            result.paymentInstrument = instrument;
        }
    }
    return result;
}

exports.getWirecardOrderPayment = getWirecardOrderPayment;
