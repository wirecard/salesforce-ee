'use strict';

/* API Includes */
var Transaction = require('dw/system/Transaction');
var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');

var collections = require('*/cartridge/scripts/util/collections');
var PaymentHelper = require('int_wirecard_core/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');

/**
 * Helper function to remove existing payment instruments from cart
 * @param {dw.order.Basket} basket - current basket
 */
function removePaymentInstruments(basket) {
    var paymentInstruments = basket.getPaymentInstruments();

    Transaction.wrap(function () {
        collections.forEach(paymentInstruments, function (pi) {
            // FIXME keep also other method not only gift certificate?
            if (pi.paymentMethod !== 'GIFT_CERTIFICATE') {
                basket.removePaymentInstrument(pi);
            }
        });
    });
}

/**
 * Handle method for creating the payment instrument of a wirecard payment method.
 * @param {dw.order.Basket} basket - current basket
 * @param {Object} paymentInformation - billing form data
 * @returns {Object} - result
 */
function Handle(basket, paymentInformation) {
    // selected payment method
    var paymentMethod = paymentInformation.paymentMethodID;

    Transaction.wrap(function () {
        removePaymentInstruments(basket);
        basket.createPaymentInstrument(paymentMethod, basket.totalGrossPrice);
    });
    // FIXME this is for monitoring test behaviour
    pgLogger.debug('Selected payment method: ' + paymentMethod);
    return { success: true };
}

/**
 * Authorizes a payment using a wirecard payment method.
 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) { // eslint-disable-line
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNumber);
    var methodName = paymentInstrument.paymentMethod;
    var responseData;

    try {
        // handles all wirecard payments except credit card (seamless integration)
        var redirectPayment = require('*/cartridge/scripts/paymentgateway/RedirectPayment');
        responseData = redirectPayment.callService(methodName, order, paymentInstrument);
    } catch (err) {
        pgLogger.error('Exception while processing the API-Call: ' + err.fileName + ': ' + err.message + '\n' + err.stack);
        return { error: true, errorMessage: err.message };
    }

    // save transaction data with order
    var result = { success: true };
    if (responseData.redirectURL) {
        result.redirectURL = responseData.redirectURL;
    }
    delete responseData.redirectURL;
    var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
    transactionHelper.saveTransactionToOrder(order, responseData);

    return result;
}

'use strict';


/**
 * Creates PaymentInstrument and returns 'success'.
 */
function processForm(req, paymentForm, viewData) {
	const success = {
        error: false,
        viewData: viewData
    };
	if ('undefined' === typeof paymentForm[paymentForm.paymentMethod.value]) {
	    return success;
    }
	const COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
	const errorFields = COHelpers.validateFields(paymentForm[paymentForm.paymentMethod.value]);

	if (Object.keys(errorFields).length) {
		return {
			error: true,
			fieldErrors: errorFields
		}
	}

    let customFormData = PaymentHelper.getFormData(paymentForm, paymentForm.paymentMethod.value);

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };
    viewData.paymentInformation = { pgFormData : customFormData };
    viewData.paymentInformation.paymentMethodID = paymentForm.paymentMethod.value;

    return success;
}

/**
 * Creates PaymentInstrument and returns 'success'.
 */
function savePaymentInformation(req, currentBasket, billingData) {
    let paymentInformation = billingData.paymentInformation.pgFormData;
    let paymentInstrument  = currentBasket.getPaymentInstruments(billingData.paymentInformation.paymentMethodID);

    if (paymentInstrument.empty || 'undefined' === typeof paymentInformation) {
    	return;
    }

    Transaction.wrap(function () {
    	Object.keys(paymentInformation).forEach(function(key) {
    		paymentInstrument[0].custom[key] = paymentInformation[key];
    	});
    });
}


exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;


/*
 * Export handle / authorize
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
