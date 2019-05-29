'use strict';

/* API Includes */
var Transaction = require('dw/system/Transaction');

var collections = require('*/cartridge/scripts/util/collections');
var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');

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
    var fp = orderHelper.getOrderFingerprint(basket, basket.custom.paymentGatewayReservedOrderNo);

    Transaction.wrap(function () {
        removePaymentInstruments(basket);
        var paymentInstrument = basket.createPaymentInstrument('PG_CREDITCARD', basket.totalGrossPrice);
        paymentInstrument.custom.paymentGatewayFingerPrint = fp;
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
    var URLUtils = require('dw/web/URLUtils');
    var result = { success: true };

    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNumber);

    try {
        if (paymentInstrument.custom.paymentGatewayFingerPrint !== orderHelper.getOrderFingerprint(order)) {
            var Resource = require('dw/web/Resource');
            throw new Error(Resource.msg('basket.integrity.failed', 'paymentgateway', 'Order integrity check failed!'));
        }

        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
            paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
        });
        result.saveTransactionURL = URLUtils.https('PaymentGatewayCredit-SaveTransaction', 'orderNo', orderNumber).toString();
        result.restoreBasketURL = URLUtils.https('PaymentGatewayCredit-RestoreBasket', 'orderNo', orderNumber).toString();
    } catch (err) {
        result = { error: true, errorMessage: err.message, errorStage: { stage: 'payment', step: 'PG_CREDITCARD' } };
    }

    return result;
}

/*
 * Export handle / authorize
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
