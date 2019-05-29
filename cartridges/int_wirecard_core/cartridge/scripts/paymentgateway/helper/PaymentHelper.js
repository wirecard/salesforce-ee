'use strict';

/**
 * @var {Object} methodsWithForms - payment gateway methods that come with form fields
 */
var methodsWithForms = {
    PG_CREDITCARD: {
        transactionData: 'text'
    },
    PG_GIROPAY: {
        bic: 'text'
    },
    PG_IDEAL: {
        bic: 'select'
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
    /**
     * Check if given payment method has form elements
     * @param {string} methodName - payment method id
     * @returns {boolean}
     */
    hasPaymentForm: function (methodName) {
        return Object.prototype.hasOwnProperty.call(methodsWithForms, methodName);
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
                // FIXME special handling for dropdowns
                result[k] = form[methodID][k].value;
            });
        }
        return result;
    },

    /**
     * Retrieve image for given payment method
     * @param {string} methodID - payment method id
     * @returns {string|dw.web.URL}
     */
    getPaymentImage: function (methodID) {
        var PaymentMgr = require('dw/order/PaymentMgr');
        var paymentMethod = PaymentMgr.getPaymentMethod(methodID);

        var image = '';
        if (methodID === 'PG_SOFORT') {
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
                ID: paymentMethod.ID,
                name: paymentMethod.name,
                active: paymentMethod.active,
                description: paymentMethod.description,
                image: paymentMethod.image ? paymentMethod.image.URL.toString() : null
            };
        }
        return result;
    }
};
