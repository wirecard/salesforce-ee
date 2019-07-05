/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
/* eslint-disable max-len */
'use strict';

var Site = require('dw/system/Site').current;
var collections = require('*/cartridge/scripts/util/collections');

var base = module.superModule;

/**
 * Creates an array of objects containing selected payment information
 * @param {dw.util.ArrayList<dw.order.PaymentInstrument>} selectedPaymentInstruments - ArrayList
 *      of payment instruments that the user is using to pay for the current basket
 * @returns {Array} Array of objects that contain information about the selected payment instruments
 */
function getSelectedPaymentInstruments(selectedPaymentInstruments) {
    return collections.map(selectedPaymentInstruments, function (paymentInstrument) {
        var results = {
            paymentMethod: paymentInstrument.paymentMethod,
            amount: paymentInstrument.paymentTransaction.amount.value
        };
        if (paymentInstrument.paymentMethod === 'CREDIT_CARD') {
            results.lastFour = paymentInstrument.creditCardNumberLastDigits;
            results.owner = paymentInstrument.creditCardHolder;
            results.expirationYear = paymentInstrument.creditCardExpirationYear;
            results.type = paymentInstrument.creditCardType;
            results.maskedCreditCardNumber = paymentInstrument.maskedCreditCardNumber;
            results.expirationMonth = paymentInstrument.creditCardExpirationMonth;
        } else if (paymentInstrument.paymentMethod === 'GIFT_CERTIFICATE') {
            results.giftCertificateCode = paymentInstrument.giftCertificateCode;
            results.maskedGiftCertificateCode = paymentInstrument.maskedGiftCertificateCode;
        } else if (paymentInstrument.paymentMethod.indexOf('PG_') > -1) {
            var paymentHelper = require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper');
            var methodData = paymentHelper.getPaymentMethodData(paymentInstrument.paymentMethod);
            results.methodImg = methodData.image;
            results.name = methodData.name;
        }
        if (/PG_SEPA/.test(paymentInstrument.paymentMethod)) {
            results.SEPADebtorName = paymentInstrument.custom.paymentGatewaySEPADebtorName;
            results.SEPAIBAN = paymentInstrument.custom.paymentGatewayIBAN;
            results.SEPABIC = paymentInstrument.custom.paymentGatewayBIC;
        }

        return results;
    });
}

/**
 * Creates an array of objects containing applicable payment methods
 * @param {dw.util.ArrayList<dw.order.dw.order.PaymentMethod>} paymentMethods - An ArrayList of
 *      applicable payment methods that the user could use for the current basket.
 * @param {dw.order.Basket} currentBasket - current basket
 * @returns {Array} of object that contain information about the applicable payment methods for the
 *      current cart
 */
function checkPaymentGatewayMethodsAvailable(paymentMethods, currentBasket) {
    var result = [];
    var shippingAddress = currentBasket.defaultShipment.shippingAddress;
    if (paymentMethods) {
        paymentMethods.forEach(function (method) {
            if (shippingAddress && ['PG_PAYOLUTION_INVOICE'].indexOf(method.ID) > -1) {
                // FIXME check for digital goods / gift certificates (will be available with a future sfra release)
                var allowedShippingCountries = Site.getCustomPreferenceValue('paymentGatewayPayolutionInvoiceAllowedShippingCountries');
                if (!allowedShippingCountries || allowedShippingCountries.split(',').indexOf(shippingAddress.countryCode.value.toUpperCase())) {
                    result.push(method);
                }
            } else {
                result.push(method);
            }
        });
    }
    return result;
}

/**
 * Payment class that represents payment information for the current basket
 * @param {dw.order.Basket} currentBasket - the target Basket object
 * @param {dw.customer.Customer} currentCustomer - the associated Customer object
 * @param {string} countryCode - the associated Site countryCode
 * @constructor
 */
function Payment(currentBasket, currentCustomer, countryCode) {
    base.call(this, currentBasket, currentCustomer, countryCode);

    var paymentInstruments = currentBasket.paymentInstruments;
    this.selectedPaymentInstruments = paymentInstruments
        ? getSelectedPaymentInstruments(paymentInstruments) : null;

    this.applicablePaymentMethods = checkPaymentGatewayMethodsAvailable(this.applicablePaymentMethods, currentBasket);
}

Payment.prototype = Object.create(base.prototype);

module.exports = Payment;
