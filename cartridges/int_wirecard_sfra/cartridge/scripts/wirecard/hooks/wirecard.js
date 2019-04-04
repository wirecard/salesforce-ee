/* eslint-disable */
'use strict';

/* API Includes */
var Transaction = require('dw/system/Transaction');

var collections = require('*/cartridge/scripts/util/collections');
/**
 * Helper function to remove existing payment instruments from cart
 * @param {dw.order.Basket} basket - current basket
 */
function removePaymentInstruments(basket) {
    var paymentInstruments = basket.getPaymentInstruments();

    Transaction.wrap(function () {
        collections.forEach(paymentInstruments, function (pi) {
            // FIXME keep also other method not only gift certificate?
            if (pi.paymentMethod !== 'GIFT_CERTIFICATE') {
                basket.removePaymentInstrument(pi);
            }
        });
    });
}

/**
 * Handle method for creating the payment instrument of a wirecard payment method.
 * @param {dw.order.Basket} basket - current basket
 * @param {Object} paymentInformation - billing form data
 * @returns {Object} - result
 */
function Handle(basket, paymentInformation) {
    // selected payment method
    var paymentMethod = paymentInformation.paymentMethodID;

    Transaction.wrap(function () {
        removePaymentInstruments(basket);
        basket.createPaymentInstrument(paymentMethod, basket.totalGrossPrice);
    });
    return { success: true };
}

/**
 * Authorizes a payment using a wirecard payment method.
 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var success;

    if (success === true) {
        return { authorized: true };
    }
    return { error: true };
}

/*
 * Export handle / authorize
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
