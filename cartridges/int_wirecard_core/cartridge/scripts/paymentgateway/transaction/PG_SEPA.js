'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type').All;

var preferenceMapping = {
    addDescriptorToRequest: 'paymentGatewaySEPAAddDescriptorToRequest'
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
        throw new Error('transaction-type missing for SEPA Transaction.');
    }
    switch (self['transaction-type']) {
        case Type.AUTHORIZATION:
            type = Type.DEBIT;
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
    var type, apiEndpoint;
    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for SEPA Transaction.');
    }
    switch (self['transaction-type']) {
        case Type.PENDING_DEBIT:
            type = Type.VOID_PENDING_DEBIT;
            apiEndpoint = 'paymentmethods';
            break;
        default:
            throw new Error('unsupported transaction type!');
    }
    return { type: type, apiEndpoint: apiEndpoint };
}

/**
 * Get transaction type for refund
 * @returns {string} - transaction type
 */
function getRefundTransactionType() {
    var self = this;
    var type;
    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for SEPA Transaction.');
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
function SEPA(order, args) {
    // default params
    var params = {
        paymentMethodID: require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper').PAYMENT_METHOD_SEPA_DIRECT_DEBIT,
        'transaction-type': this.getSitePreference('paymentGatewaySEPADebitInitialTransactionType').value,
        'merchant-account-id': this.getSitePreference('paymentGatewaySEPADebitMerchantAccountID')
    };
    if (typeof args === 'object') {
        Object.keys(args).forEach(function (k) {
            params[k] = args[k];
        });
    }
    //call the parent constructor
    Transaction.call(this, order, params);

    this.preferenceMapping = preferenceMapping;

    return this;
}
SEPA.prototype = Object.create(Transaction.prototype);

SEPA.prototype.getCustomPayload = function() {
    const PaymentHelper = require('int_wirecard_core/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');
    const StringUtils   = require('dw/util/StringUtils');
    const Calendar      = new (require('dw/util/Calendar'))();
    const instruments   = this.order.getPaymentInstruments('PG_SEPA');
    let customPayload   = {};

    if (!instruments.empty) {
        let customPaymentData = {};

        Object.keys(instruments[0].custom).forEach(function(key) {
        	customPaymentData[key] = instruments[0].custom[key];
        });
        customPaymentData.email   = this.order.customerEmail;
        customPaymentData.country = this.order.billingAddress.countryCode.value;
        customPayload             = PaymentHelper.getDataForRequest(customPaymentData, 'PG_SEPA');
    }
    customPayload['creditor-id'] = this.getSitePreference('paymentGatewaySEPAMandateCreditorID');
    customPayload['mandate']     = {
        'mandate-id' : this.order.orderNo + '-' + Calendar.getTime().getTime(),
        'signed-date': StringUtils.formatCalendar(Calendar, 'yyyy-MM-dd')
    };
    return customPayload;
};

SEPA.prototype.getApiEndpointFromTransactionType = function() {
    switch(this['transaction-type']) {
        case Type.PENDING_DEBIT :
        case Type.VOID_PENDING_DEBIT :
        case Type.DEBIT :
        default :
            return 'paymentmethods';
    }
};

SEPA.prototype.getCaptureTransactionType = getCaptureTransactionType;
SEPA.prototype.getCancelTransactionType = getCancelTransactionType;
SEPA.prototype.getRefundTransactionType = getRefundTransactionType;

module.exports = SEPA;
