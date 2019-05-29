'use strict';

var packageJson = require('int_wirecard_controllers/package.json');
var controllerCartridge = packageJson.controllerCartridge;

/* API Includes */
var Transaction = require('dw/system/Transaction');
var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');

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
 * Authorize Wirecard Payment.
 */
function Authorize(args) {
    // FIXME use more generic way to extract form data already in this step
//    var formData = app.getForm('billing');
    var formData = {};
    var order = args.Order;

    var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
    var paymentData = orderHelper.getPaymentGatewayOrderPayment(order);
    var paymentInstrument = paymentData.paymentInstrument;
    var responseData;

    try {
        // handles all wirecard payments except credit card (seamless integration)
        var redirectPayment = require('*/cartridge/scripts/paymentgateway/RedirectPayment');
        responseData = redirectPayment.callService(paymentData.paymentMethodID, order, paymentInstrument, formData);
    } catch (err) {
        pgLogger.error('Exception while processing the API-Call: ' + err.fileName + ': ' + err.message + '\n' + err.stack);
        return { error: true, errorMessage: err.message };
    }

    // save transaction data with order
    var result = { success: true };
    if (responseData.redirectURL) {
        result.redirectURL = responseData.redirectURL;
    }
    delete responseData.redirectURL;
    var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
    transactionHelper.saveTransactionToOrder(order, responseData);

    var PaymentMgr = require('dw/order/PaymentMgr');
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.setTransactionID(order.orderNo);
        paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });

    return result;
}

exports.Handle = Handle;
exports.Authorize = Authorize;
