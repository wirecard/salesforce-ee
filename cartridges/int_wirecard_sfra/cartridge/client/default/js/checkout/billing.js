'use strict';

var base = require('base/checkout/billing');

/**
 * Updates the payment information in checkout, based on the supplied order model
 * @param {Object} order - checkout model to use as basis of new truth
 */
function updatePaymentInformation(order) {
    // update payment details
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';

    if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0
    ) {
        var paymentMethodData = order.billing.payment.selectedPaymentInstruments[0];
        if (paymentMethodData.paymentMethod === 'CREDIT_CARD') {
            htmlToAppend += '<span>' + order.resources.cardType + ' '
                + paymentMethodData.type
                + '</span><div>'
                + paymentMethodData.maskedCreditCardNumber
                + '</div><div><span>'
                + order.resources.cardEnding + ' '
                + paymentMethodData.expirationMonth
                + '/' + paymentMethodData.expirationYear
                + '</span></div>';
        } else if (/^PG/.test(paymentMethodData.paymentMethod)) {
            // fallback for all methods without specific payment information
            if (Object.prototype.hasOwnProperty.call(paymentMethodData, 'methodImg')) {
                htmlToAppend += $('<img/>', {
                    src: paymentMethodData.methodImg,
                    class: 'pg-logo'
                }).prop('outerHTML');
            }
            htmlToAppend += $('<span/>', { html: paymentMethodData.name }).text();
        }
    }
    $paymentSummary.empty().append(htmlToAppend);
}
base.methods.updatePaymentInformation = updatePaymentInformation;

base.paymentTabs = function () {
    $('.payment-options .nav-item').on('click', function (e) {
        e.preventDefault();
        var methodID = $(this).data('method-id');
        $('.payment-information').data('payment-method-id', methodID);
        // dotsource custom: update selected payment method in billing form
        $('input[name$=paymentMethod]').val(methodID);
        // hide other payment methods form
        $('.credit-card-selection-new').find('.tab-pane').removeClass('active');

        const form   = $('form[name=dwfrm_billing]');
        const pgSepa = $('input[id=debtorName]', form);

        if (pgSepa.length) {
            pgSepa.val($('input[name$=_firstName]', form).val() + ' ' + $('input[name$=_lastName]', form).val());
        }
    });
};

module.exports = base;
