'use strict';

/**
 * @var {Object} methodsWithForms - payment gateway methods that come with form fields
 */
var methodsWithForms = {
    PG_GIROPAY: {
        bic: 'text'
    },
    PG_IDEAL: {
        bic: 'select'
    },
    PG_SEPA: {
    	paymentGatewaySEPABIC: 'text',
    	paymentGatewaySEPAIBAN: 'text',
        paymentGatewaySEPADebtorName: 'text'
    }
};

module.exports = {
    methodRequestKey: {
        PG_SEPA: {
            'bank-account'  : {iban: 'paymentGatewaySEPAIBAN', bic: 'paymentGatewaySEPABIC'},
            'account-holder': {
                'last-name' : 'paymentGatewaySEPADebtorName'
            }
        }
    },

	getDataForRequest: function(form, methodName) {
		if (!this.methodRequestKey[methodName]) {
			return {};
		}
		return this.recursiveObjectCreator(this.methodRequestKey[methodName], form);
	},

	recursiveObjectCreator: function(obj, data) {
		let response = {};

		Object.keys(obj).forEach(function(key) {
			if ('object' === typeof obj[key]) {
				response[key] = this.recursiveObjectCreator(obj[key], data);
			} else if ('undefined' !== typeof data[obj[key]]) {
				response[key] = data[obj[key]];
			}
		}, this);

		return response;
	},

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
            	if ('undefined' !== typeof form[methodID][k]) {
	                // FIXME special handling for dropdowns
        			result[k] = form[methodID][k].value;
            	}
        	});
        }
        return result;
    },

    /**
     * Retrieve image for given payment method
     * @param {string} methodID - payment method id
     * @param {boolean} asURLObject
     * @returns {string|dw.web.URL}
     */
    getPaymentImage: function (methodID, asURLObject) {
        var PaymentMgr = require('dw/order/PaymentMgr');
        var paymentMethod = PaymentMgr.getPaymentMethod(methodID);

        var image = '';
        if (paymentMethod && paymentMethod.image) {
            image = asURLObject ? paymentMethod.image.URL : paymentMethod.image.URL.toString();
        }
        return image;
    },

    /**
     * Retrieve payment method information
     * @param {string} methodID - payment method id
     * @returns {Object}
     */
    getPaymentMethodData: function (methodID) {
        var result = {};
        var PaymentMgr = require('dw/order/PaymentMgr');
        var paymentMethod = PaymentMgr.getPaymentMethod(methodID);

        if (paymentMethod) {
            result = {
                ID: paymentMethod.ID,
                name: paymentMethod.name,
                description: paymentMethod.description,
                image: paymentMethod.image ? paymentMethod.image.URL.toString() : null
            };
        }
        return result;
    }
};
