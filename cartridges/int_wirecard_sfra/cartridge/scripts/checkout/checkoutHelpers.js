'use strict';

var base = module.superModule;

var BasketMgr = require('dw/order/BasketMgr');
var Resource = require('dw/web/Resource');

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
    handlePayments: base.handlePayments,
    createOrder: base.createOrder,
    placeOrder: base.placeOrder,
    savePaymentInstrumentToWallet: base.savePaymentInstrumentToWallet,
    getRenderedPaymentInstruments: base.getRenderedPaymentInstruments,
    sendConfirmationEmail: base.sendConfirmationEmail,
    ensureValidShipments: base.ensureValidShipments,
    setGift: base.setGift
};
