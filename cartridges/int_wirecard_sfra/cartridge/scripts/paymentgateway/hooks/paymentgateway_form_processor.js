/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var Resource = require('dw/web/Resource');

/**
 * Paymentgateway form handling
 * @param {Object} req - The request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has error information or payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var viewData = viewFormData;
    var paymentMethodID = paymentForm.paymentMethod.value;
    viewData.paymentMethod = {
        value: paymentMethodID,
        htmlName: paymentMethodID
    };
    viewData.paymentInformation = {
        paymentMethodID: paymentMethodID
    };
    var formFields = paymentForm[paymentMethodID];
    if (formFields) {
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var errorFields = COHelpers.validateFields(formFields);

        if (Object.keys(errorFields).length) {
            return {
                error: true,
                fieldErrors: errorFields
            };
        }

        var PaymentHelper = require('int_wirecard_core/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');
        var customFormData = PaymentHelper.getFormData(paymentForm, paymentMethodID);

        // additional check for payolution form
        if (['PG_PAYOLUTION_INVOICE'].indexOf(paymentMethodID) > -1) {
            // accept consent check
            var acceptTermsField = formFields.acceptTerms;
            if (!req.form[acceptTermsField.htmlName]) {
                errorFields[acceptTermsField.htmlName] = Resource.msg('error.message.required', 'forms', null);
            }
            // min-age check
            var dobYearField = formFields.dob_year;
            var normalizedMonth = customFormData.dob_month - 1;
            var dob = new Date(customFormData.dob_year, normalizedMonth, customFormData.dob_day);
            if (dob.getDate() !== customFormData.dob_day
                || dob.getMonth() !== normalizedMonth
                || dob.getFullYear() !== customFormData.dob_year
            ) {
                errorFields[dobYearField.htmlName] = Resource.msg('error.date.invalid', 'forms', null);
            } else {
                var min18Date = new Date();
                var currentYear = min18Date.getFullYear();
                if (min18Date.setFullYear(currentYear - 18) < dob.getTime()) {
                    errorFields[dobYearField.htmlName] = Resource.msg('text_min_age_notice', 'paymentgateway', null);
                } else {
                    customFormData.paymentGatewayDateOfBirth = dob;
                }
            }
        }
        if (Object.keys(errorFields).length) {
            return {
                error: true,
                fieldErrors: errorFields
            };
        }
        viewData.paymentInformation.pgFormData = customFormData;
    }

    return {
        error: false,
        viewData: viewData
    };
}

/**
 * Save payment information to payment instrument
 * @param {Object} req - The request object
 * @param {dw.order.Basket} currentBasket - The current basket
 * @param {Object} billingData - payment information
 */
function savePaymentInformation(req, currentBasket, billingData) {
    var paymentInformation = billingData.paymentInformation.pgFormData;
    var paymentMethodID = billingData.paymentInformation.paymentMethodID;
    var paymentInstrument = currentBasket.getPaymentInstruments(paymentMethodID);
    var paymentHelper = require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper');
    var saveField = paymentHelper.getFormFieldToSave();

    if (!paymentInstrument.empty && typeof paymentInformation !== 'undefined') {
        require('dw/system/Transaction').wrap(function () {
            Object.keys(paymentInformation).forEach(function (key) {
                if (saveField(key)) {
                    paymentInstrument[0].custom[key] = paymentInformation[key];
                }
            });
        });
    }
}

exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;
