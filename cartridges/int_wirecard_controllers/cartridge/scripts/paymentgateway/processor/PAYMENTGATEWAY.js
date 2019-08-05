/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var Site = require('dw/system/Site').getCurrent();
var controllerCartridge = Site.getCustomPreferenceValue('paymentGatewayControllerCartridgeName');

/* API Includes */
var Transaction = require('dw/system/Transaction');
var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');

var Cart = require(controllerCartridge + '/cartridge/scripts/models/CartModel');
var validatePayment = require('*/cartridge/scripts/paymentgateway/util/Checkout').validatePayment;

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

    var paymentForm = session.forms.billing.paymentMethods;
    // form validation
    if (['PG_EPS', 'PG_GIROPAY', 'PG_IDEAL', 'PG_SEPA'].indexOf(paymentMethodId) > -1 && !paymentForm[paymentMethodId].valid) {
        return { error: true };
    }
    // validate payolution date-of-birth / accept consent
    var isValidPayment = validatePayment(paymentMethodId, args.Basket);
    var paymentGatewayErrors = isValidPayment.errors;
    var dateOfBirth = isValidPayment.dateOfBirth;

    if (paymentGatewayErrors.length > 0) {
        return { error: true };
    }

    // save form data with dw.order.OrderPaymentInstrument
    if (['PG_EPS', 'PG_GIROPAY'].indexOf(paymentMethodId) > -1) {
        Transaction.wrap(function () {
            paymentInstrument.custom.paymentGatewayBIC = paymentForm[paymentMethodId].paymentGatewayBIC.value;
        });
    } else if (/^PG_SEPA$/.test(paymentMethodId)) {
        Transaction.wrap(function () {
            paymentInstrument.custom.paymentGatewayBIC = paymentForm[paymentMethodId].paymentGatewayBIC.value;
            paymentInstrument.custom.paymentGatewayIBAN = paymentForm[paymentMethodId].paymentGatewayIBAN.value;
            paymentInstrument.custom.paymentGatewaySEPADebtorName = paymentForm[paymentMethodId].paymentGatewaySEPADebtorName.value;
        });
    } else if (/^PG_(PAYOLUTION|RATEPAY)_INVOICE$/.test(paymentMethodId)) {
        Transaction.wrap(function () {
            paymentInstrument.custom.paymentGatewayDateOfBirth = dateOfBirth;
        });
    } else if (/^PG_IDEAL$/.test(paymentMethodId)) {
        Transaction.wrap(function () {
            paymentInstrument.custom.paymentGatewayBIC = paymentForm.PG_IDEAL.paymentGatewayBIC.value;
        });
    }

    return { success: true };
}

/**
 * Authorize Wirecard Payment.
 */
function Authorize(args) {
    var order = args.Order;

    var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
    var paymentData = orderHelper.getPaymentGatewayOrderPayment(order);
    var paymentInstrument = paymentData.paymentInstrument;
    var responseData;

    try {
        // handles all wirecard payments except credit card (seamless integration)
        var redirectPayment = require('*/cartridge/scripts/paymentgateway/RedirectPayment');
        responseData = redirectPayment.callService(paymentData.paymentMethodID, order, paymentInstrument);
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
