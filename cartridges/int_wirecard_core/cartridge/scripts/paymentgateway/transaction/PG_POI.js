'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type').All;

var preferenceMapping = {
    sendAdditionalData: 'paymentGatewayPoiSendAdditionalData'
};

/**
 * Get transaction type for refund
 * @returns {string} - transaction type
 */
function getRefundTransactionType() {
    var self = this;
    var type;
    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for Poi Transaction.');
    }
    switch (self['transaction-type']) {
        case Type.DEBIT:
            type = Type.CREDIT;
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
function Poi(order, args) {
    // default params
    var params = {
        paymentMethodID: require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper').PAYMENT_METHOD_POI,
        'transaction-type': Type.DEBIT,
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
    this.getRefundTransactionType = getRefundTransactionType;
    return this;
}

Poi.prototype = Object.create(Transaction.prototype);

module.exports = Poi;
