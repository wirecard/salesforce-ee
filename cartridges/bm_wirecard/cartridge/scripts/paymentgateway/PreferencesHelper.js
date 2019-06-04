'use strict';

var Site = require('dw/system/Site').getCurrent();

/**
 * Helper function to retrieve specific config value
 * @param {string} key - site preference name
 * @returns {string}
 */
function getSitePreference(key) {
    var result = Site.getCustomPreferenceValue(key);
    if (!result) {
        result = '';
    }
    return result;
}

var PreferencesMapping = {
    PG_CREDITCARD: {
        userName              : 'paymentGatewayCreditCardHttpUser',
        password              : 'paymentGatewayCreditCardHttpPassword',
        baseUrl               : 'paymentGatewayCreditCardBaseUrl',
        merchantAccountID     : 'paymentGatewayCreditCardMerchantAccountID',
        sendAdditionalData    : 'paymentGatewayCreditCardSendAdditionalData',
        initialTransactionType: 'paymentGatewayCreditCardInitialTransactionType'
    },
    PG_PAYPAL: {
        userName              : 'paymentGatewayPayPalHttpUser',
        password              : 'paymentGatewayPayPalHttpPassword',
        baseUrl               : 'paymentGatewayPayPalBaseUrl',
        merchantAccountID     : 'paymentGatewayPayPalMerchantAccountID',
        sendAdditionalData    : 'paymentGatewayPayPalSendAdditionalData',
        sendBasketData        : 'paymentGatewayPayPalSendBasketData',
        initialTransactionType: 'paymentGatewayPayPalInitialTransactionType'
    },
    PG_SOFORT: {
        userName          : 'paymentGatewaySofortHttpUser',
        password          : 'paymentGatewaySofortHttpPassword',
        baseUrl           : 'paymentGatewaySofortBaseUrl',
        merchantAccountID : 'paymentGatewaySofortMerchantAccountID',
        sendAdditionalData: 'paymentGatewaySofortSendAdditionalData'
    },
    PG_SEPACREDIT: {
        userName         : 'paymentGatewaySEPACreditHttpUser',
        password         : 'paymentGatewaySEPACreditHttpPassword',
        baseUrl          : 'paymentGatewaySEPACreditBaseUrl',
        merchantAccountID: 'paymentGatewaySEPACreditMerchantAccountID'
    },
    PG_SEPA: {
        userName          : 'paymentGatewaySEPADebitHttpUser',
        password          : 'paymentGatewaySEPADebitHttpPassword',
        baseUrl           : 'paymentGatewaySEPADebitBaseUrl',
        merchantAccountID : 'paymentGatewaySEPADebitMerchantAccountID',
        sendAdditionalData: 'paymentGatewaySEPASendAdditionalData'
    }
};

var sensitiveFields = [
    'password',
    'secret'
];

/**
 * Retrieve site preference values for given payment method
 * @param {string} paymentMethodID - payment method id e.g. PG_PAYPAL
 * @returns {Object|undefined} - object with preference value or undefined
 */
function getPreferenceForMethodID(paymentMethodID) {
    var result;
    if (Object.prototype.hasOwnProperty.call(PreferencesMapping, paymentMethodID)) {
        result = {};
        Object.keys(PreferencesMapping[paymentMethodID]).forEach(function (k) {
            result[k] = getSitePreference(PreferencesMapping[paymentMethodID][k]);
        });
    }
    return result;
}

/**
 * Retrieve site preference values for all payment methods
 * @returns {ArrayList} - list with preference values
 */
function getAllPreferences() {
    var ArrayList = require('dw/util/ArrayList');
    var result = new ArrayList();
    var tmp;
    Object.keys(PreferencesMapping).forEach(function (key) {
        tmp = new ArrayList();
        tmp.push({ name: 'methodId', value: key });
        Object.keys(PreferencesMapping[key]).forEach(function (k) {
            var preferenceValue = getSitePreference(PreferencesMapping[key][k]);
            if (sensitiveFields.indexOf(k) === -1) {
                tmp.push({
                    name : k,
                    value: Object.prototype.hasOwnProperty.call(preferenceValue, 'value') ? preferenceValue.value : preferenceValue
                });
            }
        });
        result.push(tmp);
    });
    return result;
}

module.exports = {
    getAllPreferences       : getAllPreferences,
    getPreferenceForMethodID: getPreferenceForMethodID
};
