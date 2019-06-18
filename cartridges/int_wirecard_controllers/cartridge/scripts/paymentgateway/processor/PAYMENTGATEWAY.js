/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
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
    var paymentInstrument;

    Transaction.wrap(function () {
        cart.removeExistingPaymentInstruments(paymentMethodId);
        paymentInstrument = cart.createPaymentInstrument(paymentMethodId, cart.getNonGiftCertificateAmount());
    });

    if (dw.system.HookMgr.hasHook('app.payment.method.' + paymentMethodId)) {
        return dw.system.HookMgr.callHook('app.payment.method.' + paymentMethodId, 'Handle', {
            Basket: cart,
            Form  : session.forms.billing.paymentMethods
        });
    }
    var paymentForm = session.forms.billing.paymentMethods;
    if (['PG_EPS', 'PG_GIROPAY'].indexOf(paymentMethodId) > -1) {
        Transaction.wrap(function () {
            paymentInstrument.custom.paymentGatewayBIC = paymentForm[paymentMethodId].paymentGatewayBIC.value;
        });
    }

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
