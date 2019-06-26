/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/* API Includes */
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

var collections = require('*/cartridge/scripts/util/collections');
var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
var paymentHelper = require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper');

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
            throw new Error(Resource.msg('basket.integrity.failed', 'paymentgateway', 'Order integrity check failed!'));
        }

        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
            paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
        });

        // use saved credit card
        if (paymentInstrument.creditCardToken) {
            var CustomerMgr = require('dw/customer/CustomerMgr');
            var customer = CustomerMgr.getCustomerByCustomerNumber(
                order.customerNo
            );
            var wallet = customer.getProfile().getWallet();
            var paymentInstruments = wallet.getPaymentInstruments('PG_CREDITCARD');
            var array = require('*/cartridge/scripts/util/array');
            var savedCard = array.find(paymentInstruments, function (item) {
                return paymentInstrument.creditCardToken === item.creditCardToken;
            });
            // check if card still exists && if selected saved credit card is eligible for current basket
            if (!savedCard || !paymentHelper.isSavedCCEligibleForCurrentLineItemCtnr(order, savedCard)) {
                throw new Error(Resource.msg('vault_error_card_not_available', 'paymentgateway', null));
            }
            var redirectPayment = require('*/cartridge/scripts/paymentgateway/RedirectPayment');
            var response = redirectPayment.callService('PG_CREDITCARD', order, paymentInstrument);
            if (!response || !response.status || (!/^(201|200)/.test(response.status.code))) {
                throw new Error(Resource.msg('order_error', 'paymentgateway', null));
                // FIXME use meaningful error message
            }
        } else {
            result.saveTransactionURL = URLUtils.https('PaymentGatewayCredit-SaveTransaction', 'orderNo', orderNumber).toString();
            result.restoreBasketURL = URLUtils.https('PaymentGatewayCredit-RestoreBasket', 'orderNo', orderNumber).toString();
        }
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
