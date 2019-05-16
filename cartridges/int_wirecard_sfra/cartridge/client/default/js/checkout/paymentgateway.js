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
 * Submit seamless form and subsequently save transaction data with order
 * @param {string} saveTransactionUrl - payment gateway url which saves transaction data to order
 * @param {Object} cbSuccess - success callback function
 * @param {Object} cbError - error callback function
 */
function submitSeamlessForm(saveTransactionUrl, cbSuccess, cbError) {
    WirecardPaymentPage.seamlessSubmitForm({
        onSuccess: function (msg) {
            $.ajax({
                url: saveTransactionUrl,
                method: 'post',
                data: { transactionData: JSON.stringify(msg) },
                complete: function (response) {
                    var data = JSON.parse(response.responseText);
                    if (Object.prototype.hasOwnProperty.call(data, 'continueUrl')
                        && typeof cbSuccess === 'function'
                    ) {
                        cbSuccess.call(this, data);
                    } else {
                        handleError({ 'status_description_1': 'General error.' }, cbError);
                    }
                }
            });
        },
        onError: function (err) {
            $.ajax({
                url: paymentGatewayConfig.restoreBasketUrl,
                method: 'post',
                data: { transactionData: JSON.stringify(err) },
                complete: function () {
                    handleError(err, cbError);
                    getCreditCardRequestData();
                }
            });
        }
    });
}

module.exports = {
    getCreditCardRequestData: getCreditCardRequestData,
    submitSeamlessForm: submitSeamlessForm
};
