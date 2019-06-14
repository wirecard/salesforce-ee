'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type').All;

var preferenceMapping = {
    addDescriptorToRequest: 'paymentGatewayIdealAddDescriptorToRequest',
    sendAdditionalData: 'paymentGatewayIdealSendAdditionalData'
};

/**
 * Get transaction type for refund
 * @returns {string} - transaction type
 */
function getRefundTransactionType() {
    var self = this;
    var type;
    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for Ideal Transaction.');
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
function Ideal(order, args) {
    // default params
    var params = {
        paymentMethodID: require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper').PAYMENT_METHOD_IDEAL,
        'transaction-type': Type.DEBIT,
        'merchant-account-id': this.getSitePreference('paymentGatewayIdealMerchantAccountID')
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

Ideal.prototype = Object.create(Transaction.prototype);

/**
 * Add bank-account data saved from payment form with orderPaymentInstrument
 */
Ideal.prototype.getCustomPayload = function() {
    var paymentHelper = require('int_wirecard_core/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');
    var instruments = this.order.getPaymentInstruments('PG_IDEAL');
    var result = {};

    if (!instruments.empty) {
        var customPaymentData = {};

        Object.keys(instruments[0].custom).forEach(function(key) {
            customPaymentData[key] = instruments[0].custom[key];
        });
        result = paymentHelper.getDataForRequest(customPaymentData, 'PG_IDEAL');
    }
    return result;
}

module.exports = Ideal;
