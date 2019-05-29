'use strict';

var packageJson = require('int_wirecard_controllers/package.json');
var controllerCartridge = packageJson.controllerCartridge;

/* API Includes */
var Transaction = require('dw/system/Transaction');

/* Script Modules */
var Cart = require(controllerCartridge + '/cartridge/scripts/models/CartModel');

/**
 * Creates PaymentInstrument and returns 'success'.
 */
function Handle(args) {
    var cart = Cart.get(args.Basket);
    var paymentMethodId = args.PaymentMethodID;

    Transaction.wrap(function () {
        cart.removeExistingPaymentInstruments(paymentMethodId);
        cart.createPaymentInstrument(paymentMethodId, cart.getNonGiftCertificateAmount());
    });

    return { success: true };
}

/**
 * Authorize Wirecard Credit Card.
 */
function Authorize(args) {
    var result = { success: true };
    var order = args.Order;
    var paymentInstrument = args.PaymentInstrument;

    var PaymentMgr = require('dw/order/PaymentMgr');
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();

    try {
        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.setTransactionID(order.orderNo);
            paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
        });
    } catch (err) {
        result = { error: true, errorMessage: err.message };
    }

    return result;
}

exports.Handle = Handle;
exports.Authorize = Authorize;
