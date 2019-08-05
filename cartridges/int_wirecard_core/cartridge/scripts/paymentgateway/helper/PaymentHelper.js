/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/**
 * @var {Object} methodsWithForms - payment gateway methods that come with form fields
 */
var methodsWithForms = {
    PG_EPS: {
        paymentGatewayBIC: 'text'
    },
    PG_GIROPAY: {
        paymentGatewayBIC: 'text'
    },
    PG_IDEAL: {
        paymentGatewayBIC: 'select'
    },
    PG_PAYOLUTION_INVOICE: {
        acceptTerms: 'text',
        dob_day    : 'text',
        dob_month  : 'text',
        dob_year   : 'text'
    },
    PG_RATEPAY_INVOICE: {
        dob_day  : 'text',
        dob_month: 'text',
        dob_year : 'text'
    },
    PG_SEPA: {
        paymentGatewayBIC           : 'text',
        paymentGatewayIBAN          : 'text',
        paymentGatewaySEPADebtorName: 'text'
    }
};

/**
 * @var {array} supportedLocalesForSofort - locales for which a dedicated logo is available
 */
var supportedLocalesForSofort = [
    'de_at',
    'fr_be',
    'nl_be',
    'fr_fr',
    'de_de',
    'it_it',
    'nl_nl',
    'pl_pl',
    'es_es',
    'fr_ch',
    'fr_de',
    'fr_it',
    'en_gb'
];

module.exports = {
    methodRequestKey: {
        PG_EPS: {
            'bank-account': { bic: 'paymentGatewayBIC' }
        },
        PG_GIROPAY: {
            'bank-account': { bic: 'paymentGatewayBIC' }
        },
        PG_IDEAL: {
            'bank-account': { bic: 'paymentGatewayBIC' }
        },
        PG_SEPA: {
            'bank-account'  : { iban: 'paymentGatewayIBAN', bic: 'paymentGatewayBIC' },
            'account-holder': {
                'last-name': 'paymentGatewaySEPADebtorName'
            }
        }
    },

    getDataForRequest: function (form, methodName) {
        if (!this.methodRequestKey[methodName]) {
            return {};
        }
        return this.recursiveObjectCreator(this.methodRequestKey[methodName], form);
    },

    recursiveObjectCreator: function (obj, data) {
        var response = {};

        Object.keys(obj).forEach(function (key) {
            if ('object' === typeof obj[key]) {
                response[key] = this.recursiveObjectCreator(obj[key], data);
            } else if ('undefined' !== typeof data[obj[key]]) {
                response[key] = data[obj[key]];
            }
        }, this);

        return response;
    },

    /**
     * Retrieve form values for given payment method
     * @param {dw.wb.Form} form - checkout billing form
     * @param {string} methodID - payment method id
     * @returns {boolean}
     */
    getFormData: function (form, methodID) {
        var result = {};
        if (form[methodID]) {
            Object.keys(methodsWithForms[methodID]).forEach(function (k) {
                if ('undefined' !== typeof form[methodID][k]) {
                    // FIXME special handling for dropdowns
                    result[k] = form[methodID][k].value;
                }
            });
        }
        return result;
    },

    /**
     * Check if value from form field has to be saved with payment instrument
     * @param {string} method - payment method id
     * @returns {Object}
     */
    getFormFieldToSave: function (methodID) {
        var fields = [];
        if (Object.prototype.hasOwnProperty.call(methodsWithForms, methodID)) {
            fields = [].concat(Object.keys(methodsWithForms[methodID]));
        }
        if (/^PG_(PAYOLUTION|RATEPAY)_INVOICE$/.test(methodID)) {
            fields = ['paymentGatewayDateOfBirth'];
        }

        /**
         * @param {string} fieldName - form field name
         * @returns {boolean}
         */
        return function (fieldName) {
            return fields.indexOf(fieldName) > -1;
        };
    },

    /**
     * Retrieve image for given payment method
     * @param {string} method - payment method
     * @returns {string|dw.web.URL}
     */
    getPaymentImage: function (method) {
        var paymentMethod;
        if (method instanceof dw.order.PaymentMethod) {
            paymentMethod = method;
        } else {
            var PaymentMgr = require('dw/order/PaymentMgr');
            paymentMethod = PaymentMgr.getPaymentMethod(method);
        }

        var image = '';
        if (paymentMethod.ID === 'PG_SOFORT') {
            var locale = 'en_gb'; // fallback
            if (request.locale && supportedLocalesForSofort.indexOf(request.locale.toLowerCase()) > -1) {
                locale = request.locale.toLowerCase();
            }
            image = 'https://cdn.klarna.com/1.0/shared/image/generic/badge/xx_XX/pay_now/standard/pink.svg'.replace('xx_XX', locale);
        } else if (paymentMethod && paymentMethod.image) {
            image = paymentMethod.image.URL.toString();
        }
        return image;
    },

    /**
     * Retrieve payment method information
     * @param {string} methodID - payment method id
     * @returns {undefined|Object}
     */
    getPaymentMethodData: function (methodID) {
        var result;
        var PaymentMgr = require('dw/order/PaymentMgr');
        var paymentMethod = PaymentMgr.getPaymentMethod(methodID);

        if (paymentMethod) {
            result = {
                ID         : paymentMethod.ID,
                name       : paymentMethod.name,
                active     : paymentMethod.active,
                description: paymentMethod.description,
                image      : this.getPaymentImage(paymentMethod)
            };
        }
        return result;
    },

    PAYMENT_METHOD_SEPA_DIRECT_DEBIT: 'sepadirectdebit',
    PAYMENT_METHOD_CREDIT_CARD      : 'creditcard',
    PAYMENT_METHOD_CREDIT_CARD3DS   : 'creditcard3ds',
    PAYMENT_METHOD_EPS              : 'eps',
    PAYMENT_METHOD_GIROPAY          : 'giropay',
    PAYMENT_METHOD_IDEAL            : 'ideal',
    PAYMENT_METHOD_PAYPAL           : 'paypal',
    PAYMENT_METHOD_PAYOLUTION_INV   : 'payolution-inv',
    PAYMENT_METHOD_POI              : 'wiretransfer',
    PAYMENT_METHOD_PIA              : 'wiretransfer',
    PAYMENT_METHOD_RATEPAY          : 'ratepay-invoice',
    PAYMENT_METHOD_SEPA_CREDIT      : 'sepacredit',
    PAYMENT_METHOD_SOFORT           : 'sofortbanking',
    PAYMENT_METHOD_ALIPAY           : 'alipay-xborder'
};
