/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/**
 * Paymentgateway credit card form handling
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
    var saveCCElementName = paymentForm.PG_CREDITCARD.pgSaveCC.htmlName;
    viewData.PG_CREDITCARD = { saveCC: !!req.form[saveCCElementName] };

    return {
        error: false,
        viewData: viewData
    };
}

/**
 * Set saveCCToken property to payment instrument if customer wants to save credit card
 * @param {Object} req - The request object
 * @param {dw.order.Basket} currentBasket - The current basket
 * @param {Object} billingData - payment information
 */
function savePaymentInformation(req, currentBasket, billingData) {
    var paymentInstrument = currentBasket.getPaymentInstruments(billingData.paymentMethod.value);
    // set save-cc value with payment instrument
    var saveCC = billingData.PG_CREDITCARD.saveCC;
    if (paymentInstrument.length === 1 && saveCC) {
        require('dw/system/Transaction').wrap(function () {
            paymentInstrument[0].custom.paymentGatewaySaveCCToken = true;
        });
    }
}

exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;
