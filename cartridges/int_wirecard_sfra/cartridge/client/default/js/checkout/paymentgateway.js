/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
/* globals WirecardPaymentPage */
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
 * Bind change event to saved credit card inputs
 */
function selectSavedCreditCard() {
    $('.pg-saved-cards').change(function (e) {
        e.preventDefault();
        var pgCreditCardTab = $(this).parents('div[id^=PG_CREDITCARD]');
        var pgFormFields = pgCreditCardTab.find('.payment-form-fields');
        var cardID = $(':checked', this).val();
        pgFormFields.find('#pg_cc_token').val(cardID);
    });
}

/**
 * Handle credit card tab selection: reset other tab content
 */
function resetCardForm() {
    $('#savedcc-tab').on('shown.bs.tab', function () {
        $('#pg_save_cc').prop('checked', false);
        $('#pg_save_cc_copy').prop('checked', false);
    });
    $('#newcc-tab').on('shown.bs.tab', function () {
        var pgCardList = $('.pg-saved-cards');
        pgCardList.find('input[name=pg_cc_token_copy]:checked').prop('checked', false);
        var pgCreditCardTab = $('div[id^=PG_CREDITCARD]');
        var pgFormFields = pgCreditCardTab.find('.payment-form-fields');
        pgFormFields.find('#pg_cc_token').val('');
    });
}

/**
 * Bind click event to saved card / delete card
 */
function removeSavedCC() {
    $('.remove-card', '.pg-saved-cards').click(function (e) {
        e.preventDefault();
        var $this = $(this);
        var pgCardList = $this.parents('div.pg-saved-cards');
        var csrfInput = pgCardList.find('#pg_cc_csrf');
        var url = pgCardList.data('removeCardUrl') + '?cardId=' + $this.data('id')
            + '&' + csrfInput.attr('name') + '=' + csrfInput.val();
        $.ajax({
            url: url,
            method: 'get',
            success: function (responseText) {
                pgCardList.empty().html(responseText);
                removeSavedCC(); // re-init
            },
            error: function (err) {
                console.error(err);
            }
        });
    });
}

/**
 * Calls PaymentgatewayCredit-RequestData for retrieving request data to render seamless form
 */
function getCreditCardRequestData() {
    var url = $('#pg-creditcard-form').data('requestDataUrl');
    $.ajax({
        url: url,
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
 * @param {string} restoreBasketUrl - url for restoring the basket in case of an error
 * @param {Object} cbSuccess - success callback function
 * @param {Object} cbError - error callback function
 */
function submitSeamlessForm(saveTransactionUrl, restoreBasketUrl, cbSuccess, cbError) {
    WirecardPaymentPage.seamlessSubmitForm({
        onSuccess: function (msg) {
            $.ajax({
                url: saveTransactionUrl,
                method: 'post',
                data: { transactionData: JSON.stringify(msg) },
                complete: function (response) {
                    var data = JSON.parse(response.responseText);
                    if (Object.prototype.hasOwnProperty.call(data, 'acsUrl')) {
                        var now = new Date().getTime();
                        $('body').append(
                            $('<form/>', {
                                action: data.acsUrl, enctype: 'application/x-www-form-urlencoded', method: 'post', name: 'pgacsform_' + now
                            })
                                .append($('<input/>', { name: 'PaReq', value: data.pareq, type: 'hidden' }))
                                .append($('<input/>', { name: 'TermUrl', value: data.termUrl, type: 'hidden' }))
                                .append($('<input/>', { name: 'MD', value: data.md, type: 'hidden' }))
                        );
                        $('form[name=pgacsform_' + now + ']').submit();
                    } else if (Object.prototype.hasOwnProperty.call(data, 'continueUrl')
                        && typeof cbSuccess === 'function'
                    ) {
                        cbSuccess.call(this, data);
                    } else {
                        handleError({ status_description_1: 'General error.' }, cbError);
                    }
                }
            });
        },
        onError: function (err) {
            $.ajax({
                url: restoreBasketUrl,
                method: 'post',
                data: { transactionData: JSON.stringify(err) },
                complete: function (response) {
                    var data = JSON.parse(response.responseText);
                    handleError(err, cbError);
                    if (!(Object.prototype.hasOwnProperty.call(data, 'success'))) {
                        window.location.href = data.redirectUrl;
                    }
                }
            });
        }
    });
}

module.exports = {
    removeSavedCC: removeSavedCC,
    resetCardForm: resetCardForm,
    selectSavedCreditCard: selectSavedCreditCard,
    getCreditCardRequestData: getCreditCardRequestData,
    submitSeamlessForm: submitSeamlessForm
};
