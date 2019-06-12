/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/**
 * Paymentgateway form handling
 * @param {Object} req - The request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has error information or payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var viewData = viewFormData;
    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };
    viewData.paymentInformation = {
        paymentMethodID: paymentForm.paymentMethod.value
    };
    var formFields = paymentForm[paymentForm.paymentMethod.value];
    if (formFields) {
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var errorFields = COHelpers.validateFields(formFields);

        if (Object.keys(errorFields).length) {
            return {
                error: true,
                fieldErrors: errorFields
            }
        }

        var PaymentHelper = require('int_wirecard_core/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');
        var customFormData = PaymentHelper.getFormData(paymentForm, paymentForm.paymentMethod.value);
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
 * @param {dw.order.Basket} basket - The current basket
 * @param {Object} billingData - payment information
 */
function savePaymentInformation(req, currentBasket, billingData) {
    var paymentInformation = billingData.paymentInformation.pgFormData;
    var paymentInstrument = currentBasket.getPaymentInstruments(billingData.paymentInformation.paymentMethodID);

    if (!paymentInstrument.empty && 'undefined' !== typeof paymentInformation) {
        require('dw/system/Transaction').wrap(function () {
            Object.keys(paymentInformation).forEach(function(key) {
                paymentInstrument[0].custom[key] = paymentInformation[key];
            });
        });
    }
}

exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;
