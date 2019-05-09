'use strict';

/* API Includes */
var Transaction = require('dw/system/Transaction');
var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');

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
 * @returns {Object} - result
 */
function Handle(basket) {
    Transaction.wrap(function () {
        removePaymentInstruments(basket);
        basket.createPaymentInstrument('PG_CREDITCARD', basket.totalGrossPrice);
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
function Authorize(orderNumber, paymentInstrument, paymentProcessor) { // eslint-disable-line
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNumber);
    var result = { success: true };

    try {
        // save transaction data with order
        var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
        transactionHelper.saveSeamlessTransactionToOrder(order, paymentInstrument.custom.paymentGatewayData);

        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
            paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            // delete paymentInstrument.custom.paymentGatewayData;
        });
    } catch (err) {
        result = { error: true, errorMessage: err.message };
    }

    return result;
}

/*
 * Export handle / authorize
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
