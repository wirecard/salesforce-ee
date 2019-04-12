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
    PG_PAYPAL: {
        userName         : 'paymentGatewayPayPalHttpUser',
        password         : 'paymentGatewayPayPalHttpPassword',
        merchantAccountID: 'paymentGatewayPayPalMerchantAccountID'
    }
};

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
        return result;
    }
}

module.exports = { getPreferenceForMethodID: getPreferenceForMethodID };
