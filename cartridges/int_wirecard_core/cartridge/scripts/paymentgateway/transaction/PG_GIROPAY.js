'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type').All;

var preferenceMapping = {
    addDescriptorToRequest: 'paymentGatewayGiropayAddDescriptorToRequest',
    sendAdditionalData: 'paymentGatewayGiropaySendAdditionalData'
};

/**
 * Get transaction type for refund
 * @returns {string} - transaction type
 */
function getRefundTransactionType() {
    var self = this;
    var type;
    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for Giropay Transaction.');
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
function Giropay(order, args) {
    // default params
    var params = {
        paymentMethodID: 'giropay',
        'transaction-type': Type.DEBIT,
        'merchant-account-id': this.getSitePreference('paymentGatewayGiropayMerchantAccountID')
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

Giropay.prototype = Object.create(Transaction.prototype);

/**
 * Add bank-account data saved from payment form with orderPaymentInstrument
 */
Giropay.prototype.getCustomPayload = function() {
    var paymentHelper = require('int_wirecard_core/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');
    var instruments = this.order.getPaymentInstruments('PG_GIROPAY');
    var result = {};

    if (!instruments.empty) {
        var customPaymentData = {};

        Object.keys(instruments[0].custom).forEach(function(key) {
            customPaymentData[key] = instruments[0].custom[key];
        });
        result = paymentHelper.getDataForRequest(customPaymentData, 'PG_GIROPAY');
    }
    return result;
}

module.exports = Giropay;
