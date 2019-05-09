/* globals WirecardPaymentPage, paymentGatewayConfig */
'use strict';

/**
 * Helper function that logs errors from WirePaymentPage
 * @param {string} err - message with error status
 * @param {Object} cb - error callback function
 */
function handleError(err, cb) {
    var errorMessage = '';
    if (Object.prototype.hasOwnProperty.call(err, 'status_description_1')) {
        errorMessage = err.status_description_1;
    }
    if (typeof cb === 'function') {
        cb.call(this, errorMessage);
    }
}

/**
 * Calls PaymentgatewayCredit-RequestData for retrieving request data to render seamless form
 */
function getCreditCardRequestData() {
    $.ajax({
        url: paymentGatewayConfig.getRequestDataUrl,
        method: 'get',
        complete: function (msg) {
            WirecardPaymentPage.seamlessRenderForm({
                requestData: JSON.parse(msg.responseText),
                wrappingDivId: 'pg-creditcard-form',
                onSuccess: function () {
                    $('#pg-creditcard-form').height(400).fadeIn();
                },
                onError: handleError
            });
        }
    });
}

/**
 * Submit seamless form and subsequently execute callback fn (place order)
 * @param {string} paymentMethodId - current payment method
 * @param {Object} cbSuccess - success callback function
 * @param {Object} cbError - error callback function
 */
function submitSeamlessForm(paymentMethodId, cbSuccess, cbError) {
    WirecardPaymentPage.seamlessSubmitForm({
        onSuccess: function (msg) {
            if (typeof cbSuccess === 'function') {
                cbSuccess.call(this, { paymentMethodId: paymentMethodId, transactionData: JSON.stringify(msg) });
            }
        },
        onError: function (err) {
            handleError(err, cbError);
        }
    });
}

module.exports = {
    getCreditCardRequestData: getCreditCardRequestData,
    submitSeamlessForm: submitSeamlessForm
};
