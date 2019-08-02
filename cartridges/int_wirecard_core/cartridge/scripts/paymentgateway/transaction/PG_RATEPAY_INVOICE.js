/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type').All;

var stringHelper = require('*/cartridge/scripts/paymentgateway/util/StringHelper');

var preferenceMapping = {
    addDesc: 'paymentGatewayRatepayInvoiceAddDescriptorToRequest',
    sendAdditionalData: 'paymentGatewayRatepayInvoiceSendAdditionalData'
};

/**
 * Prepend "0" to date values
 * @param {string} str - date value (e.g. month, day)
 * @returns {string} - string with prepended "0"
 */
function prependLeadingZero(str) {
    return stringHelper.padLeft(str, 2, '0');
}

/**
 * Get transaction type for capture
 * @returns {string} - transaction type
 */
function getCaptureTransactionType() {
    var self = this;
    var type;
    var canPartialCapture = false;

    if (!self['transaction-type']) {
        throw new Error('transaction-type missing for Ratepay Invoice Transaction.');
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
        throw new Error('transaction-type missing for Ratepay Invoice Transaction.');
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
        throw new Error('transaction-type missing for Ratepay Invoice Transaction.');
    }
    switch (self['transaction-type']) {
        case Type.CAPTURE_AUTHORIZATION:
            type = Type.REFUND_CAPTURE;
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
function Ratepay(order, args) {
    // default params
    var params = {
        paymentMethodID: require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper').PAYMENT_METHOD_RATEPAY,
        'transaction-type': Type.AUTHORIZATION,
        'merchant-account-id': this.getSitePreference('paymentGatewayRatepayInvoiceMerchantAccountID')
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
    this.getRefundTransactionType = getRefundTransactionType;
    this.getCaptureTransactionType = getCaptureTransactionType;
    return this;
}

Ratepay.prototype = Object.create(Transaction.prototype);

/**
 * Add date-of-birth saved with orderPaymentInstrument
 */
Ratepay.prototype.getCustomPayload = function () {
    var instruments = this.order.getPaymentInstruments('PG_RATEPAY_INVOICE');
    var result = {};

    if (!instruments.empty) {
        var dob = instruments[0].custom.paymentGatewayDateOfBirth;
        var dobString = [
            dob.getFullYear(),
            prependLeadingZero(dob.getMonth() + 1),
            prependLeadingZero(dob.getDate())
        ].join('-');
        result['account-holder'] = {
            'date-of-birth': dobString
        };
    }
    return result;
};

Ratepay.prototype.getApiEndpointFromTransactionType = function () {
    switch (this['transaction-type']) {
        case Type.VOID_AUTHORIZATION :
        case Type.CAPTURE_AUTHORIZATION :
        case Type.REFUND_CAPTURE :
            return 'payments';
        default :
            return 'paymentmethods';
    }
};

/**
 * must send full payload for ratepay
 * @returns {boolean}
 */
Ratepay.prototype.hasReducedPayload = function () {
    return false;
};


module.exports = Ratepay;
