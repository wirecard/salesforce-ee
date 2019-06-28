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
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site').current;
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

    var paymentForm = session.forms.billing.paymentMethods;
    // form validation
    if (['PG_EPS', 'PG_GIROPAY', 'PG_IDEAL', 'PG_SEPA'].indexOf(paymentMethodId) > -1 && !paymentForm[paymentMethodId].valid) {
        return { error: true };
    }
    // validate payolution date-of-birth / accept consent
    var paymentGatewayErrors = [];
    var dateOfBirth;
    if (paymentMethodId.equals('PG_PAYOLUTION_INVOICE')) {
        var httpParameterMap = request.httpParameterMap;
        var acceptConsentField = paymentForm[paymentMethodId].acceptTerms;
        if (!(Object.prototype.hasOwnProperty.call(httpParameterMap, acceptConsentField.htmlName))) {
            paymentGatewayErrors.push(Resource.msg('error.message.required', 'forms', null));
        }
        // min-age check
        var dobYearField = paymentForm[paymentMethodId].dob_year;
        var dobMonthField = paymentForm[paymentMethodId].dob_month;
        var dobDayField = paymentForm[paymentMethodId].dob_day;
        var normalizedMonth = dobMonthField.value - 1;
        var dob = new Date(dobYearField.value, normalizedMonth, dobDayField.value);
        if (dob.getDate() !== dobDayField.value
            || dob.getMonth() !== normalizedMonth
            || dob.getFullYear() !== dobYearField.value
        ) {
            paymentGatewayErrors.push(Resource.msg('error.date.invalid', 'forms', null));
        } else {
            var min18Date = new Date();
            var currentYear = min18Date.getFullYear();
            if (min18Date.setFullYear(currentYear - 18) < dob.getTime()) {
                paymentGatewayErrors.push(Resource.msg('text_min_age_notice', 'paymentgateway', null));
            } else {
                dateOfBirth = dob;
            }
        }
        // compare shipping / billing address
        if (Site.getCustomPreferenceValue('paymentGatewayPayolutionInvoiceBillingSameAsShipping')) {
            var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
            var billingAddressHash = orderHelper.getAddressHash(args.Basket.billingAddress);
            var shippingAddressHash = orderHelper.getAddressHash(args.Basket.defaultShipment.shippingAddress);
            if (billingAddressHash !== shippingAddressHash) {
                paymentGatewayErrors.push(Resource.msg('text_need_same_address_notice', 'paymentgateway', null));
            }
        }
    }
    if (paymentGatewayErrors.length > 0) {
        session.privacy.paymentGatewayErrors = JSON.stringify(paymentGatewayErrors);
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
    } else if (paymentMethodId === 'PG_PAYOLUTION_INVOICE') {
        Transaction.wrap(function () {
            paymentInstrument.custom.paymentGatewayDateOfBirth = dateOfBirth;
        });
    } else if (paymentMethodId === 'PG_IDEAL') {
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
