/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
/* eslint-disable max-len */
'use strict';

var collections = require('*/cartridge/scripts/util/collections');
var paymentHelper = require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper');

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
            var methodData = paymentHelper.getPaymentMethodData(paymentInstrument.paymentMethod);
            results.methodImg = methodData.image;
            results.name = methodData.name;
        }

        return results;
    });
}

/**
 * Check if PG_CREDITCARD customer paymentInstrument can be used for current Basket
 * @param {dw.order.Basket} currentBasket - the current basket
 * @param {dw.customer.CustomerPaymentInstrument} paymentInstrument - saved customer payment instrument
 * @returns {boolean} - returns true if billing / shipping address of payment instrument match those of current basket
 */
function isSavedCCEligibleForCurrentBasket(currentBasket, paymentInstrument) { // eslint-disable-line
    var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
    var billingAddressHash = orderHelper.getAddressHash(currentBasket.billingAddress);
    var shippingAddressHash = null;
    if (currentBasket.shipments.length > 0) {
        shippingAddressHash = orderHelper.getAddressHash(currentBasket.shipments[0].shippingAddress);
    }

    return function (basket, paymentInstrument) { // eslint-disable-line
        var customAttributes = paymentInstrument.raw.custom;
        var savedBillingAddrHash = Object.prototype.hasOwnProperty.call(customAttributes, 'paymentGatewayBillingAddressHash')
            ? customAttributes.paymentGatewayBillingAddressHash : '';
        var savedShippingAddrHash = Object.prototype.hasOwnProperty.call(customAttributes, 'paymentGatewayShippingAddressHash')
            ? customAttributes.paymentGatewayShippingAddressHash : '';
        return paymentInstrument.methodID === paymentHelper.PAYMENT_METHOD_CREDIT_CARD
            && savedBillingAddrHash === billingAddressHash
            && savedShippingAddrHash === shippingAddressHash;
    };
}

/**
 * Creates an array of objects containing applicable credit cards
 * @param {dw.customer.Customer} currentCustomer - the current customer
 * @param {dw.order.Basket} currentBasket - the current basket
 * @returns {Object} Object with saved PG_CREDITCARD instruments applicable for the current basket.
 */
function applicablePaymentGatewayPaymentCards(currentCustomer, currentBasket) {
    var isOneClickEnabled = require('dw/system/Site').getCurrent().getCustomPreferenceValue('paymentGatewayCreditCardOneClickCheckout');
    var result = {
        isEnabled: isOneClickEnabled,
        paymentInstruments: []
    };
    if (isOneClickEnabled && currentCustomer.isRegistered() && currentCustomer.isAuthenticated()) {
        var paymentInstruments = currentCustomer.profile.wallet.getPaymentInstruments('PG_CREDITCARD');
        if (paymentInstruments.length > 0) {
            var iter = paymentInstruments.iterator();
            while (iter.hasNext()) {
                var paymentInstr = iter.next();
                if (isSavedCCEligibleForCurrentBasket(currentBasket, paymentInstr)) {
                    result.paymentInstruments.push({
                        UUID: paymentInstr.UUID,
                        accountHolder: paymentInstr.creditCardHolder,
                        cardToken: paymentInstr.creditCardToken,
                        maskedAccountNumber: paymentInstr.custom.paymentGatewayMaskedAccountNumber
                    });
                }
            }
        }
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

    this.paymentGatewayOneClick = applicablePaymentGatewayPaymentCards(currentCustomer, currentBasket);
}

Payment.prototype = Object.create(base.prototype);

module.exports = Payment;
