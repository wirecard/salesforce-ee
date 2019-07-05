/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var base = require('base/checkout/billing');
var addressHelpers = require('base/checkout/address');
var cleave = require('base/components/cleave');

var paymentgateway = require('./paymentgateway');

/**
 * updates the billing address form values within payment forms
 * @param {Object} order - the order model
 */
function updateBillingAddressFormValues(order) {
    var billing = order.billing;
    if (!billing.billingAddress || !billing.billingAddress.address) return;

    var form = $('form[name=dwfrm_billing]');
    if (!form) return;

    $('input[name$=_firstName]', form).val(billing.billingAddress.address.firstName);
    $('input[name$=_lastName]', form).val(billing.billingAddress.address.lastName);
    $('input[name$=_address1]', form).val(billing.billingAddress.address.address1);
    $('input[name$=_address2]', form).val(billing.billingAddress.address.address2);
    $('input[name$=_city]', form).val(billing.billingAddress.address.city);
    $('input[name$=_postalCode]', form).val(billing.billingAddress.address.postalCode);
    $('select[name$=_stateCode],input[name$=_stateCode]', form)
        .val(billing.billingAddress.address.stateCode);
    $('select[name$=_country]', form).val(billing.billingAddress.address.countryCode.value);
    $('input[name$=_phone]', form).val(billing.billingAddress.address.phone);
    $('input[name$=_email]', form).val(order.orderEmail);

    if (billing.payment && billing.payment.selectedPaymentInstruments
        && billing.payment.selectedPaymentInstruments.length > 0
        && billing.payment.selectedPaymentInstruments.filter(function (i) { return i.paymentMethod === 'CREDIT_CARD'; }).length === 1
    ) {
        var instrument = billing.payment.selectedPaymentInstruments[0];
        $('select[name$=expirationMonth]', form).val(instrument.expirationMonth);
        $('select[name$=expirationYear]', form).val(instrument.expirationYear);
        // Force security code and card number clear
        $('input[name$=securityCode]', form).val('');
        $('input[name$=cardNumber]').data('cleave').setRawValue('');
    }
}
base.methods.updateBillingAddressFormValues = updateBillingAddressFormValues;

/**
 * Updates the billing information in checkout, based on the supplied order model
 * @param {Object} order - checkout model to use as basis of new truth
 * @param {Object} customer - customer model to use as basis of new truth
 * @param {Object} [options] - options
 */
function updateBillingInformation(order, customer) {
    base.methods.updateBillingAddressSelector(order, customer);

    // update billing address form
    updateBillingAddressFormValues(order);

    // update billing address summary
    addressHelpers.methods.populateAddressSummary(
        '.billing .address-summary',
        order.billing.billingAddress.address
    );

    // update billing parts of order summary
    $('.order-summary-email').text(order.orderEmail);

    if (order.billing.billingAddress.address) {
        $('.order-summary-phone').text(order.billing.billingAddress.address.phone);
    }
}
base.methods.updateBillingInformation = updateBillingInformation;

/**
 * clears the billing address form values
 */
function clearBillingAddressFormValues() {
    updateBillingAddressFormValues({
        billing: {
            billingAddress: {
                address: {
                    countryCode: {}
                }
            }
        }
    });
}

base.methods.clearBillingAddressFormValues = clearBillingAddressFormValues;

base.clearBillingForm = function () {
    $('body').on('checkout:clearBillingForm', function () {
        clearBillingAddressFormValues();
    });
};

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
        } else if (/^PG_/.test(paymentMethodData.paymentMethod)) {
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
        var paymentOptionTab = $('[id=' + methodID + '-content');
        if (paymentOptionTab.length) {
            paymentOptionTab.addClass('active');
            if (methodID === 'PG_CREDITCARD') {
                paymentgateway.getCreditCardRequestData();
            }
        }
        const form   = $('form[name=dwfrm_billing]');
        const pgSepa = $('input[id=debtorName]', form);

        if (pgSepa.length) {
            pgSepa.val($('input[name$=_firstName]', form).val() + ' ' + $('input[name$=_lastName]', form).val());
        }
    });
    var activeItem = $('.payment-options .nav-item > a.nav-link.active');
    if (activeItem.length === 1 && /PG_CREDITCARD/.test(activeItem.attr('class'))) {
        if (typeof WirecardPaymentPage === 'undefined') {
            $('.tab-pane.active').removeClass('active');
            activeItem.removeClass('active');
        } else {
            paymentgateway.getCreditCardRequestData();
        }
    }
};

base.handleCreditCardNumber = function () {
    if ($('.cardNumber').length === 1) {
        cleave.handleCreditCardNumber('.cardNumber', '#cardType');
    }
};
base.createPayolutionLink = paymentgateway.createPayolutionLink;

module.exports = base;
