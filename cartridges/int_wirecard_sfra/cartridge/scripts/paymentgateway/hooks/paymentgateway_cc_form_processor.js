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
    var ccTokenElementName = paymentForm.PG_CREDITCARD.pgCCToken.htmlName;
    viewData.PG_CREDITCARD = {
        saveCC: !!req.form[saveCCElementName],
        cardId: req.form[ccTokenElementName]
    };

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
    var paymentInstrument = currentBasket.getPaymentInstruments('PG_CREDITCARD');
    // set save-cc value with payment instrument
    var saveCC = billingData.PG_CREDITCARD.saveCC;
    // save token with payment instrument
    var cardId = billingData.PG_CREDITCARD.cardId;

    if (paymentInstrument.length === 1) {
        if (saveCC) {
            require('dw/system/Transaction').wrap(function () {
                paymentInstrument[0].custom.paymentGatewaySaveCCToken = true;
            });
        } else if (cardId) {
            var CustomerMgr = require('dw/customer/CustomerMgr');
            var customer = CustomerMgr.getCustomerByCustomerNumber(
                req.currentCustomer.profile.customerNo
            );
            var wallet = customer.getProfile().getWallet();
            var paymentInstruments = wallet.getPaymentInstruments('PG_CREDITCARD');
            var array = require('*/cartridge/scripts/util/array');
            var savedCard = array.find(paymentInstruments, function (item) {
                return cardId === item.UUID;
            });
            if (savedCard) {
                require('dw/system/Transaction').wrap(function () {
                    paymentInstrument[0].creditCardNumber = savedCard.custom.paymentGatewayMaskedAccountNumber;
                    paymentInstrument[0].creditCardToken = savedCard.creditCardToken;
                });
            }
        }
    }
}

exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;
