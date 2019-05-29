'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type').All;

var preferenceMapping = {
    merchantAccountId: 'paymentGatewayCreditCardMerchantAccountID'
};

/**
 * Get transaction type for capture
 * @returns {string} - transaction type
 */
function getCaptureTransactionType() {
    var self = this;
    var type;
    var canPartialCapture = false;

    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for CreditCard Transaction.');
    }
    switch (self['transaction-type']) {
        case Type.AUTHORIZATION:
            type = Type.CAPTURE_AUTHORIZATION;
            canPartialCapture = true;
            break;
        default:
            throw new Error('unsupported transaction type!');
    }
    return { type: type, partialAllowed: canPartialCapture };
}

/**
 * Get transaction type for cancellation
 * @returns {string} - transaction type
 */
function getCancelTransactionType() {
    var self = this;
    var type;
    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for CreditCard Transaction.');
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
    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for CreditCard Transaction.');
    }
    switch (self['transaction-type']) {
        case Type.PURCHASE:
            type = Type.VOID_PURCHASE;
            break;
        case Type.CAPTURE_AUTHORIZATION:
            type = Type.VOID_CAPTURE;
            break;
        default:
            throw new Error('unsupported transaction type!');
    }
    return { type: type, partialAllowed: true };
}

/**
 * Constructor.
 * @param {dw.order.Order} order - current order
 * @param {Object} args - additional parameter
 * @returns {Object} - transaction
 */
function CreditCard(order, args) {
    // default params
    var params = {
        paymentMethodID: 'creditcard',
        'merchant-account-id': this.getSitePreference('merchantAccountId')
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

CreditCard.prototype = Object.create(Transaction.prototype);

module.exports = CreditCard;
