/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
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
    PG_EPS: {
        userName          : 'paymentGatewayEpsHttpUser',
        password          : 'paymentGatewayEpsHttpPassword',
        baseUrl           : 'paymentGatewayEpsBaseUrl',
        merchantAccountID : 'paymentGatewayEpsMerchantAccountID',
        sendAdditionalData: 'paymentGatewayEpsSendAdditionalData'
    },
    PG_GIROPAY: {
        userName          : 'paymentGatewayGiropayHttpUser',
        password          : 'paymentGatewayGiropayHttpPassword',
        baseUrl           : 'paymentGatewayGiropayBaseUrl',
        merchantAccountID : 'paymentGatewayGiropayMerchantAccountID',
        sendAdditionalData: 'paymentGatewayGiropaySendAdditionalData'
    },
    PG_IDEAL: {
        userName          : 'paymentGatewayIdealHttpUser',
        password          : 'paymentGatewayIdealHttpPassword',
        baseUrl           : 'paymentGatewayIdealBaseUrl',
        merchantAccountID : 'paymentGatewayIdealMerchantAccountID',
        sendAdditionalData: 'paymentGatewayIdealSendAdditionalData'
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
    PG_PAYOLUTION_INVOICE_EUR: {
        userName          : 'paymentGatewayPayolutionInvoiceHttpUser',
        password          : 'paymentGatewayPayolutionInvoiceHttpPassword',
        baseUrl           : 'paymentGatewayPayolutionInvoiceBaseUrl',
        merchantAccountID : 'paymentGatewayPayolutionInvoiceMerchantAccountID',
        sendAdditionalData: 'paymentGatewayPayolutionInvoiceSendAdditionalData'
    },
    PG_PAYOLUTION_INVOICE_CHF: {
        userName          : 'paymentGatewayPayolutionInvoiceHttpUserCHF',
        password          : 'paymentGatewayPayolutionInvoiceHttpPasswordCHF',
        baseUrl           : 'paymentGatewayPayolutionInvoiceBaseUrl',
        merchantAccountID : 'paymentGatewayPayolutionInvoiceMerchantAccountIDCHF',
        sendAdditionalData: 'paymentGatewayPayolutionInvoiceSendAdditionalData'
    },
    PG_RATEPAY_INVOICE: {
        userName          : 'paymentGatewayRatepayInvoiceHttpUser',
        password          : 'paymentGatewayRatepayInvoiceHttpPassword',
        baseUrl           : 'paymentGatewayRatepayInvoiceBaseUrl',
        merchantAccountID : 'paymentGatewayRatepayInvoiceMerchantAccountID',
        sendAdditionalData: 'paymentGatewayRatepayInvoiceSendAdditionalData'
    },
    PG_POI: {
        userName          : 'paymentGatewayPoiHttpUser',
        password          : 'paymentGatewayPoiHttpPassword',
        baseUrl           : 'paymentGatewayPoiBaseUrl',
        merchantAccountID : 'paymentGatewayPoiMerchantAccountID',
        sendAdditionalData: 'paymentGatewayPoiSendAdditionalData'
    },
    PG_PIA: {
        userName          : 'paymentGatewayPiaHttpUser',
        password          : 'paymentGatewayPiaHttpPassword',
        baseUrl           : 'paymentGatewayPiaBaseUrl',
        merchantAccountID : 'paymentGatewayPiaMerchantAccountID',
        sendAdditionalData: 'paymentGatewayPiaSendAdditionalData'
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
    },
    PG_ALIPAY: {
        userName          : 'paymentGatewayAlipayHttpUser',
        password          : 'paymentGatewayAlipayHttpPassword',
        baseUrl           : 'paymentGatewayAlipayBaseUrl',
        merchantAccountID : 'paymentGatewayAlipayMerchantAccountID',
        sendAdditionalData: 'paymentGatewayAlipaySendAdditionalData'
    }
};

var sensitiveFields = [
    'password',
    'passwordCHF',
    'secret',
    'secretCHF'
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
