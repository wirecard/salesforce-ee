/* eslint-disable max-len */
'use strict';

var base = module.superModule;

var BasketMgr = require('dw/order/BasketMgr');
var Resource = require('dw/web/Resource');
var HookMgr = require('dw/system/HookMgr');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

/**
 * Validate credit card form fields
 * @param {Object} form - the form object with pre-validated form fields
 * @returns {Object} the names of the invalid form fields
 */
function validateCreditCard(form) {
    var result = {};
    var currentBasket = BasketMgr.getCurrentBasket();

    // form.paymentMethod.value needs to be checked prior to validating the credit form
    if (!form.paymentMethod.value) {
        if (currentBasket.totalGrossPrice.value > 0) {
            result[form.paymentMethod.htmlName] = Resource.msg('error.no.selected.payment.method', 'creditCard', null);
        }

        return result;
    }

    return base.validateFields(form.creditCardFields);
}

/**
 * Validate credit card form fields
 * @param {Object} form - the form object with pre-validated form fields
 * @returns {Object} the names of the invalid form fields
 */
function validateSEPA(form) {

}
/**
 * handles the payment authorization for each payment instrument
 * @param {dw.order.Order} order - the order object
 * @param {string} orderNumber - The order number for the order
 * @returns {Object} an error object
 */
function handlePayments(order, orderNumber) {
    var result = {};

    if (order.totalNetPrice !== 0) {
        var paymentInstruments = order.paymentInstruments;

        if (paymentInstruments.length === 0) {
            Transaction.wrap(function () { OrderMgr.failOrder(order); });
            result.error = true;
        }

        if (!result.error) {
            for (var i = 0; i < paymentInstruments.length; i += 1) {
                var paymentInstrument = paymentInstruments[i];
                var paymentProcessor = PaymentMgr
                    .getPaymentMethod(paymentInstrument.paymentMethod)
                    .paymentProcessor;
                var authorizationResult;
                if (paymentProcessor === null) {
                    Transaction.begin();
                    paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                    Transaction.commit();
                } else {
                    if (HookMgr.hasHook('app.payment.processor.' + paymentProcessor.ID.toLowerCase())) {
                        authorizationResult = HookMgr.callHook(
                            'app.payment.processor.' + paymentProcessor.ID.toLowerCase(),
                            'Authorize',
                            orderNumber,
                            paymentInstrument,
                            paymentProcessor
                        );
                    } else {
                        authorizationResult = HookMgr.callHook(
                            'app.payment.processor.default',
                            'Authorize'
                        );
                    }

                    if (authorizationResult.error) {
                        Transaction.wrap(function () { OrderMgr.failOrder(order); });
                        result.error = true;
                        result.errorMessage = authorizationResult.errorMessage;
                        break;
                    } else if (authorizationResult.redirectURL) {
                        // redirect to wpg
                        result.redirectURL = authorizationResult.redirectURL;
                    }
                }
            }
        }
    }

    return result;
}


module.exports = {
    getFirstNonDefaultShipmentWithProductLineItems: base.getFirstNonDefaultShipmentWithProductLineItems,
    ensureNoEmptyShipments: base.ensureNoEmptyShipments,
    getProductLineItem: base.getProductLineItem,
    isShippingAddressInitialized: base.isShippingAddressInitialized,
    prepareShippingForm: base.prepareShippingForm,
    prepareBillingForm: base.prepareBillingForm,
    copyCustomerAddressToShipment: base.copyCustomerAddressToShipment,
    copyCustomerAddressToBilling: base.copyCustomerAddressToBilling,
    copyShippingAddressToShipment: base.copyShippingAddressToShipment,
    copyBillingAddressToBasket: base.copyBillingAddressToBasket,
    validateFields: base.validateFields,
    validateShippingForm: base.validateShippingForm,
    validateBillingForm: base.validateBillingForm,
    validatePayment: base.validatePayment,
    validateCreditCard: validateCreditCard,
    calculatePaymentTransaction: base.calculatePaymentTransaction,
    recalculateBasket: base.recalculateBasket,
    handlePayments: handlePayments,
    createOrder: base.createOrder,
    placeOrder: base.placeOrder,
    savePaymentInstrumentToWallet: base.savePaymentInstrumentToWallet,
    getRenderedPaymentInstruments: base.getRenderedPaymentInstruments,
    sendConfirmationEmail: base.sendConfirmationEmail,
    ensureValidShipments: base.ensureValidShipments,
    setGift: base.setGift
};
