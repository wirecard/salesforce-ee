'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type').All;

var preferenceMapping = {
    addDescriptorToRequest: 'paymentGatewayPayPalAddDescriptorToRequest',
    sendAdditionalData: 'paymentGatewayPayPalSendAdditionalData',
    sendBasketData: 'paymentGatewayPayPalSendBasketData'
};

/**
 * Get transaction type for capture
 * @returns {string} - transaction type
 */
function getCaptureTransactionType() {
    var self = this;
    var type;
    var canPartialRefund = false;

    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for PayPal Transaction.');
    }
    switch (self['transaction-type']) {
        case Type.AUTHORIZATION:
            type = Type.CAPTURE_AUTHORIZATION;
            canPartialRefund = true;
            break;
        default:
            throw new Error('unsupported transaction type!');
    }
    return { type: type, partialAllowed: canPartialRefund };
}

/**
 * Get transaction type for cancellation
 * @returns {string} - transaction type
 */
function getCancelTransactionType() {
    var self = this;
    var type;
    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for PayPal Transaction.');
    }
    switch (self['transaction-type']) {
        case Type.AUTHORIZATION:
            type = Type.VOID_AUTHORIZATION;
            break;
        default:
            throw new Error('unsupported transaction type!');
    }
    return { type: type };
}

/**
 * Get transaction type for refund
 * @returns {string} - transaction type
 */
function getRefundTransactionType() {
    var self = this;
    var type;
    var canPartialRefund = false;
    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for PayPal Transaction.');
    }
    switch (self['transaction-type']) {
        case Type.DEBIT:
            type = Type.REFUND_DEBIT;
            canPartialRefund = true;
            break;
        case Type.CAPTURE_AUTHORIZATION:
            type = Type.REFUND_CAPTURE;
            break;
        default:
            throw new Error('unsupported transaction type!');
    }
    return { type: type, partialAllowed: canPartialRefund };
}

/**
 * Constructor.
 * @param {dw.order.Order} order - current order
 * @param {Object} args - additional parameter
 * @returns {Object} - transaction
 */
function PayPal(order, args) {
    // default params
    var params = {
        paymentMethodID: 'paypal',
        'transaction-type': this.getSitePreference('paymentGatewayPayPalInitialTransactionType').value,
        'merchant-account-id': this.getSitePreference('paymentGatewayPayPalMerchantAccountID')
    };
    if (typeof args === 'object') {
        Object.keys(args).forEach(function (k) {
            params[k] = args[k];
        });
    }
    var transaction = new Transaction(order, params);
    transaction.preferenceMapping = preferenceMapping;

    // add methods to retrieve possible succeeding operations
    transaction.getCancelTransactionType = getCancelTransactionType;
    transaction.getCaptureTransactionType = getCaptureTransactionType;
    transaction.getRefundTransactionType = getRefundTransactionType;
    return transaction;
}

PayPal.prototype = Object.create(Transaction.prototype);

module.exports = PayPal;
