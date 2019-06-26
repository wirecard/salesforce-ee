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
        paymentMethodID: require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper').PAYMENT_METHOD_CREDIT_CARD,
        'transaction-type': this.getSitePreference('paymentGatewayCreditCardInitialTransactionType').value,
        'merchant-account-id': this.getSitePreference('merchantAccountId')
    };
    if (typeof args === 'object') {
        Object.keys(args).forEach(function (k) {
            params[k] = args[k];
        });
    }
    Transaction.call(this, order, params);
    this.preferenceMapping = preferenceMapping;

    // add methods to retrieve possible succeeding operations
    this.getCancelTransactionType = getCancelTransactionType;
    this.getCaptureTransactionType = getCaptureTransactionType;
    this.getRefundTransactionType = getRefundTransactionType;
    return this;
}

CreditCard.prototype = Object.create(Transaction.prototype);

/**
 * Add ccToken from orderPaymentInstrument
 */
CreditCard.prototype.getCustomPayload = function () {
    var instruments = this.order.getPaymentInstruments('PG_CREDITCARD');
    var result = {};

    if (instruments.length === 1 && instruments[0].creditCardToken) {
        result = {
            'card-token': {
                'token-id': instruments[0].creditCardToken,
                'masked-account-number': instruments[0].creditCardNumber
            }
        };
    }
    return result;
};

module.exports = CreditCard;
