/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
/* eslint-disable max-len */
'use strict';

var base = module.superModule;

var BasketMgr = require('dw/order/BasketMgr');
var Resource = require('dw/web/Resource');
var HookMgr = require('dw/system/HookMgr');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Site = require('dw/system/Site').getCurrent();
var Transaction = require('dw/system/Transaction');

/**
 * Validates payment: checks min age for PG_PAYOLUTION
 * @param {Object} req - The local instance of the request object
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Object} an object that has error information
 */
function validatePayment(req, currentBasket) {
    var result = base.validatePayment.call(null, req, currentBasket);
    if (!result.error) {
        var invalid = false;
        var errorMessage;
        var paymentInstruments = currentBasket.paymentInstruments;
        var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
        var billingAddressHash = orderHelper.getAddressHash(currentBasket.billingAddress);
        var shippingAddressHash = orderHelper.getAddressHash(currentBasket.defaultShipment.shippingAddress);

        for (var i = 0; i < paymentInstruments.length; i += 1) {
            var paymentInstrument = paymentInstruments[i];
            var paymentMethod = paymentInstrument.getPaymentMethod();
            if (/^PG_PAYOLUTION_INVOICE$/.test(paymentMethod)
                && Site.getCustomPreferenceValue('paymentGatewayPayolutionInvoiceBillingSameAsShipping')
                && billingAddressHash !== shippingAddressHash
            ) {
                // shipping is not the same as billing address
                invalid = true;
                errorMessage = Resource.msg('text_need_same_address_notice', 'paymentgateway', null);
            } else if (/^PG_RATEPAY_INVOICE$/.test(paymentMethod)
                && Site.getCustomPreferenceValue('paymentGatewayRatepayInvoiceBillingSameAsShipping')
                && billingAddressHash !== shippingAddressHash
            ) {
                // shipping is not the same as billing address
                invalid = true;
                errorMessage = Resource.msg('text_need_same_address_notice', 'paymentgateway', null);
            }
            if (invalid) {
                break; // there is an invalid payment instrument
            }
        }
        result.error = invalid;
        result.errorMessage = errorMessage;
    }
    return result;
}

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
 * Attempts to create an order from the current basket / with reserved orderNo for PG_CREDITCARD
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {dw.order.Order} The order object created from the current basket
 */
function createOrder(currentBasket) {
    var order;

    try {
        if (currentBasket.custom.paymentGatewayReservedOrderNo) {
            order = Transaction.wrap(function () {
                return OrderMgr.createOrder(currentBasket, currentBasket.custom.paymentGatewayReservedOrderNo);
            });
        } else {
            order = Transaction.wrap(function () {
                return OrderMgr.createOrder(currentBasket);
            });
        }
    } catch (error) {
        Transaction.wrap(function () {
            delete currentBasket.custom.paymentGatewayReservedOrderNo; // eslint-disable-line
        });
        return null;
    }
    return order;
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
                        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
                        // unset reserved orderNo for current basket
                        var currentBasket = BasketMgr.getCurrentBasket();
                        Transaction.wrap(function () { // eslint-disable-line
                            delete currentBasket.custom.paymentGatewayReservedOrderNo; // eslint-disable-line
                        });
                        result.error = true;
                        result.errorMessage = authorizationResult.errorMessage;
                        if (Object.prototype.hasOwnProperty.call(authorizationResult, 'errorStage')) {
                            result.errorStage = authorizationResult.errorStage;
                        }
                        break;
                    } else if (authorizationResult.saveTransactionURL) {
                        result.saveTransactionURL = authorizationResult.saveTransactionURL;
                        result.restoreBasketURL = authorizationResult.restoreBasketURL;
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
    validatePayment: validatePayment,
    validateCreditCard: validateCreditCard,
    calculatePaymentTransaction: base.calculatePaymentTransaction,
    recalculateBasket: base.recalculateBasket,
    handlePayments: handlePayments,
    createOrder: createOrder,
    placeOrder: base.placeOrder,
    savePaymentInstrumentToWallet: base.savePaymentInstrumentToWallet,
    getRenderedPaymentInstruments: base.getRenderedPaymentInstruments,
    sendConfirmationEmail: base.sendConfirmationEmail,
    ensureValidShipments: base.ensureValidShipments,
    setGift: base.setGift
};
