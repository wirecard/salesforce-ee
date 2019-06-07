/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/**
 * Submit credit card form on placeOrder.submit
 */
function bindPlaceOrderFormSubmit() {
    $('form.submit-order').on('submit', function () {
        var methodInput = $('[name=paymentgateway_method_id]');
        if (methodInput.length === 1 && methodInput.val() === 'PG_CREDITCARD') {
            $.ajax({
                url: Urls.requestDataPGCreditCard,
                method: 'get',
                complete: function (msg) {
                    // console.log(msg.responseText);
                    WirecardPaymentPage.embeddedPay(JSON.parse(msg.responseText));
                }
            });
            return false;
        }
    });
}

exports.init = function () {
    bindPlaceOrderFormSubmit();
};
