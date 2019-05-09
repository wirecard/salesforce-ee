/* globals WirecardPaymentPage */
'use strict';

/**
 * Helper function that logs errors from WirePaymentPage
 * @param {string} error - message with error status
 */
function handleError(error) {
    console.log(error);
}

/**
 * Calls PaymentgatewayCredit-RequestData for retrieving request data to render seamless form
 */
function getCreditCardRequestData() {
    $.ajax({
        url: paymentGatewayConfig.getRequestDataUrl,
        method: 'get',
        complete: function (msg) {
            console.log(msg.responseText);
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
 * @param {Object} cb - callback function
 */
function submitSeamlessForm(paymentMethodId, cb) {
    WirecardPaymentPage.seamlessSubmitForm({
        onSuccess: function (msg) {
            if (typeof cb === 'function') {
                cb.call(this, { paymentMethodId: paymentMethodId, transactionData: JSON.stringify(msg) });
            }
        },
        onError: handleError
    });
}

module.exports = {
    getCreditCardRequestData: getCreditCardRequestData,
    submitSeamlessForm: submitSeamlessForm
};
