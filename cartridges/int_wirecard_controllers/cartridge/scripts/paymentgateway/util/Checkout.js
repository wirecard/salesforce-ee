/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/* API includes */
var HookMgr = require('dw/system/HookMgr');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site').current;
var Transaction = require('dw/system/Transaction');
var PaymentInstrument = require('dw/order/PaymentInstrument');

/* Script includes */
var packageJson = require('int_wirecard_controllers/package.json');
var controllerCartridge = packageJson.controllerCartridge;
var app = require(controllerCartridge + '/cartridge/scripts/app');

/**
 * holds form ids for payment methods to reset if not selected
 */
var resetPaymentForms = {
    PG_GIROPAY           : 'PG_GIROPAY',
    PG_IDEAL             : 'PG_IDEAL',
    PG_SEPA              : 'PG_SEPA',
    PG_PAYOLUTION_INVOICE: 'PG_PAYOLUTION_INVOICE'
};

// default payment methods
resetPaymentForms[PaymentInstrument.METHOD_BML] = 'bml';
resetPaymentForms[PaymentInstrument.METHOD_CREDIT_CARD] = 'creditCard';

/**
 * Removes the other payment methods.
 * @return {Boolean} Returns true if payment is successfully reset.
 */
function removePaymentInstrumentsFromBasket() {
    var cart = app.getModel('Cart').get();
    var paymentMethods = app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.options;

    var status = Transaction.wrap(function () {
        for (var paymentMethodIndex in paymentMethods) {
            var paymentMethod = paymentMethods[paymentMethodIndex];
            if (paymentMethod.value !== app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value
                && paymentMethod.value !== 'GIFT_CERTIFICATE'
            ) {
                cart.removePaymentInstruments(cart.getPaymentInstruments(paymentMethod.value));
            }
        }

        // reset po method form
        for (var paymentMethodName in resetPaymentForms) {
            if (paymentMethodName !== app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value) {
                var paymentMethodFormIndex = resetPaymentForms[paymentMethodName];

                var formelement = app.getForm('billing').object.paymentMethods[paymentMethodFormIndex];
                if (formelement) {
                    formelement.clearFormElement();
                }
            }
        }

        return true;
    });

    return status;
}

/**
 * Checks if all requirements for selected payment method are met for current basket/order
 * @param {string} paymentMethodId - payment gateway payment method id
 * @param {dw.order.LineItemContainer} lineItemCtnr - current basket / order
 * @return {Object} Contains (empty) list with errors caused by unmet required conditions and date of birth.
 */
function validatePayment(paymentMethodId, lineItemCtnr) {
    var httpParameterMap = request.httpParameterMap;
    var paymentForm = session.forms.billing.paymentMethods;

    var paymentGatewayErrors = [];
    var dateOfBirth;

    if (/^PG_PAYOLUTION_INVOICE$/.test(paymentMethodId)) {
        var acceptConsentField = paymentForm[paymentMethodId].acceptTerms;
        if (!(Object.prototype.hasOwnProperty.call(httpParameterMap, acceptConsentField.htmlName))) {
            paymentGatewayErrors.push(Resource.msg('error.message.required', 'forms', null));
        }
    }
    if (/^PG_(PAYOLUTION|RATEPAY)_INVOICE$/.test(paymentMethodId)) {
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
        var sitePrefBillingSameAsShipping;
        if (/^PG_PAYOLUTION_INVOICE$/.test(paymentMethodId)) {
            sitePrefBillingSameAsShipping = Site.getCustomPreferenceValue('paymentGatewayPayolutionInvoiceBillingSameAsShipping');
        } else {
            sitePrefBillingSameAsShipping = Site.getCustomPreferenceValue('paymentGatewayRatepayInvoiceBillingSameAsShipping');
        }
        if (sitePrefBillingSameAsShipping) {
            var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
            var billingAddressHash = orderHelper.getAddressHash(lineItemCtnr.billingAddress);
            var shippingAddressHash = orderHelper.getAddressHash(lineItemCtnr.defaultShipment.shippingAddress);
            if (billingAddressHash !== shippingAddressHash) {
                paymentGatewayErrors.push(Resource.msg('text_need_same_address_notice', 'paymentgateway', null));
            }
        }
        // dis-allow if basket contains digital goods
        var hasDigitalProducts = HookMgr.callHook('int.wirecard.order', 'hasDigitalProducts', lineItemCtnr);
        if (hasDigitalProducts) {
            var paymentMethod = require('dw/order/PaymentMgr').getPaymentMethod(paymentMethodId);
            paymentGatewayErrors.push(Resource.msgf('basket.digital.error', 'paymentgateway', null, paymentMethod.name));
        }
    }
    if (paymentGatewayErrors.length > 0) {
        // error message(s) will be shown in billing step
        session.privacy.paymentGatewayErrors = JSON.stringify(paymentGatewayErrors);
    }

    return {
        errors     : paymentGatewayErrors,
        dateOfBirth: dateOfBirth
    };
}

/**
 * Validates payment instruments in COBilling-validatePayment.
 * @param {dw.order.LineItemContainer} lineItemCtnr - current basket / order
 * @param {dw.util.ArrayList} paymentInstruments - list with current basket's payment instruments
 * @return {dw.util.ArrayList} Returns an array with the valid PaymentInstruments.
 */
function validatePaymentInstruments(currentBasket, paymentInstruments) {
    var ArrayList = require('dw/util/ArrayList');

    // Collects all invalid payment instruments.
    var validPaymentInstruments = new ArrayList(paymentInstruments);
    var invalidPaymentInstruments = new ArrayList();

    for (var i = 0; i < paymentInstruments.length; i++) {
        var paymentInstrument = paymentInstruments[i];
        if (/^PG_(PAYOLUTION|RATEPAY)_INVOICE$/.test(paymentInstrument.paymentMethod)) {
            var isValid = validatePayment(paymentInstrument.paymentMethod, currentBasket);
            if (isValid.errors.length === 0) {
                continue;
            }
        } else {
            // Continues if method is applicable.
            continue;
        }
        // Collects invalid payment instruments.
        invalidPaymentInstruments.add(paymentInstrument);
        validPaymentInstruments.remove(paymentInstrument);
    }

    if (invalidPaymentInstruments.size()) {
        return {
            InvalidPaymentInstruments: invalidPaymentInstruments,
            ValidPaymentInstruments: validPaymentInstruments
        };
    } else {
        return {
            ValidPaymentInstruments: validPaymentInstruments
        };
    }
}

exports.removePaymentInstrumentsFromBasket = removePaymentInstrumentsFromBasket;
exports.validatePaymentInstruments = validatePaymentInstruments;
exports.validatePayment = validatePayment;
