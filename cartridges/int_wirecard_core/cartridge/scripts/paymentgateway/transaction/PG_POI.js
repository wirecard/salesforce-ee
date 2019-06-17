'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type').All;

var preferenceMapping = {
    addDescriptorToRequest: 'paymentGatewayPoiAddDescriptorToRequest',
    sendAdditionalData: 'paymentGatewayPoiSendAdditionalData'
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
        throw new Error('transaction-type missing for Purchase On Invoice Transaction.');
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
        throw new Error('transaction-type missing for Purchase On Invoice Transaction.');
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
 * Constructor.
 * @param {dw.order.Order} order - current order
 * @param {Object} args - additional parameter
 * @returns {Object} - transaction
 */
function Poi(order, args) {
    // default params
    var params = {
        paymentMethodID: require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper').PAYMENT_METHOD_POI,
        'transaction-type': Type.AUTHORIZATION,
        'merchant-account-id': this.getSitePreference('paymentGatewayPoiMerchantAccountID')
    };
    if (typeof args === 'object') {
        Object.keys(args).forEach(function (k) {
            params[k] = args[k];
        });
    }
    Transaction.call(this, order, params);
    this.preferenceMapping = preferenceMapping;

    // add methods to retrieve possible succeeding operations
    this.getCaptureTransactionType = getCaptureTransactionType;
    this.getCancelTransactionType = getCancelTransactionType;
    return this;
}

Poi.prototype = Object.create(Transaction.prototype);

module.exports = Poi;
