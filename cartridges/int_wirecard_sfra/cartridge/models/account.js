/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var URLUtils = require('dw/web/URLUtils');

var base = module.superModule;

/**
 * Creates a plain object that contains payment instrument information
 * @param {Object} userPaymentInstruments - current customer's paymentInstruments
 * @returns {Object} object that contains info about the current customer's payment instruments
 */
function getCustomerPaymentInstruments(userPaymentInstruments) {
    var paymentInstruments = [];

    userPaymentInstruments.forEach(function (paymentInstrument) {
        var result = {
            creditCardHolder: paymentInstrument.creditCardHolder,
            maskedCreditCardNumber: paymentInstrument.maskedCreditCardNumber,
            creditCardType: paymentInstrument.creditCardType,
            creditCardExpirationMonth: paymentInstrument.creditCardExpirationMonth,
            creditCardExpirationYear: paymentInstrument.creditCardExpirationYear,
            UUID: paymentInstrument.UUID
        };

        result.cardTypeImage = {
            src: URLUtils.staticURL('/images/'
                + paymentInstrument.creditCardType.toLowerCase().replace(/\s/g, '')
                + '-dark.svg'),
            alt: paymentInstrument.creditCardType
        };

        if (paymentInstrument.raw.paymentMethod !== 'PG_CREDITCARD') {
            paymentInstruments.push(result);
        }
    });

    return paymentInstruments;
}

/**
 * Creates a plain object that contains payment instrument information
 * @param {Object} wallet - current customer's wallet
 * @returns {Object} object that contains info about the current customer's payment instrument
 */
function getPayment(wallet) {
    if (wallet) {
        var paymentInstruments = wallet.paymentInstruments;
        var paymentInstrument;
        for (var i = 0; i < paymentInstruments.length; i += 1) {
            var card = paymentInstruments[i];
            if (card.raw.paymentMethod !== 'PG_CREDITCARD') {
                paymentInstrument = card;
                break;
            }
        }

        if (paymentInstrument) {
            return {
                maskedCreditCardNumber: paymentInstrument.maskedCreditCardNumber,
                creditCardType: paymentInstrument.creditCardType,
                creditCardExpirationMonth: paymentInstrument.creditCardExpirationMonth,
                creditCardExpirationYear: paymentInstrument.creditCardExpirationYear
            };
        }
    }
    return null;
}

/**
 * Account class that represents the current customer's profile dashboard
 * @param {dw.customer.Customer} currentCustomer - Current customer
 * @param {Object} addressModel - The current customer's preferred address
 * @param {Object} orderModel - The current customer's order history
 * @constructor
 */
function account(currentCustomer, addressModel, orderModel) {
    base.call(this, currentCustomer, addressModel, orderModel);
    this.payment = getPayment(currentCustomer.wallet);
    this.customerPaymentInstruments = currentCustomer.wallet
        && currentCustomer.wallet.paymentInstruments
        ? getCustomerPaymentInstruments(currentCustomer.wallet.paymentInstruments)
        : null;
}

account.prototype = Object.create(base.prototype);

account.getCustomerPaymentInstruments = getCustomerPaymentInstruments;

module.exports = account;
