'use strict';

var base = require('base/checkout/shipping');
var addressHelpers = require('base/checkout/address');

var paymentgateway = require('./paymentgateway');

/**
 * Does Ajax call to select shipping method
 * @param {string} url - string representation of endpoint URL
 * @param {Object} urlParams - url params
 * @param {Object} el - element that triggered this call
 */
function selectShippingMethodAjax(url, urlParams, el) {
    $.spinner().start();
    $.ajax({
        url: url,
        type: 'post',
        dataType: 'json',
        data: urlParams
    })
        .done(function (data) {
            if (data.error) {
                window.location.href = data.redirectUrl;
            } else {
                $('body').trigger('checkout:updateCheckoutView',
                    {
                        order: data.order,
                        customer: data.customer,
                        options: { keepOpen: true },
                        urlParams: urlParams
                    }
                );
                $('body').trigger('checkout:postUpdateCheckoutView',
                    {
                        el: el
                    }
                );
                // re-render credit card form
                var activePayment = $('.payment-options .nav-item > a.nav-link.active');
                if (activePayment.length === 1
                    && /PG_CREDITCARD/.test(activePayment.attr('class'))
                    && typeof WirecardPaymentPage !== 'undefined'
                ) {
                    paymentgateway.getCreditCardRequestData();
                }
            }
            $.spinner().stop();
        })
        .fail(function () {
            $.spinner().stop();
        });
}

function selectShippingMethod() {
    $('.shipping-method-list').change(function () {
        var $shippingForm = $(this).parents('form');
        var methodID = $(':checked', this).val();
        var shipmentUUID = $shippingForm.find('[name=shipmentUUID]').val();
        var urlParams = addressHelpers.methods.getAddressFieldsFromUI($shippingForm);
        urlParams.shipmentUUID = shipmentUUID;
        urlParams.methodID = methodID;
        urlParams.isGift = $shippingForm.find('.gift').prop('checked');
        urlParams.giftMessage = $shippingForm.find('textarea[name$=_giftMessage]').val();

        var url = $(this).data('select-shipping-method-url');
        selectShippingMethodAjax(url, urlParams, $(this));
    });
}

base.selectShippingMethod = selectShippingMethod;

module.exports = base;
