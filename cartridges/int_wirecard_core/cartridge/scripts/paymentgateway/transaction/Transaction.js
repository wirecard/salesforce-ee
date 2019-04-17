'use strict';

var Money = require('dw/value/Money');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site').getCurrent();

var Type = require('./Type');

/**
 * Helper function to retrieve specific config value
 * @param {string} key - site preference name
 * @returns {string}
 */
function getSitePreference(key) {
    var methodKey = key;
    if (Object.prototype.hasOwnProperty.call(this, 'preferenceMapping')
        && Object.keys(this.preferenceMapping).indexOf(key) > -1
    ) {
        methodKey = this.preferenceMapping[key];
    }
    var result = Site.getCustomPreferenceValue(methodKey);
    if (!result) {
        result = '';
    }
    return result;
}

/**
 * Create unique request id
 * @param {dw.order.LineItemCtnr} order - current order
 * @returns {string}
 */
function getRequestID(order) {
    var Mac = require('dw/crypto/Mac');
    var mac = new Mac(Mac.HMAC_SHA_256);
    var timeStamp = new Date().getTime();
    var requestBytes = mac.digest(
        [Site.ID, order.UUID, timeStamp].join(''),
        getSitePreference('paymentGatewayShopName')
    );
    var requestID = require('dw/crypto/Encoding').toHex(requestBytes);
    var index = 0;
    var result = [];
    [8, 6, 6, 6, 12].forEach(function (r) {
        result.push(requestID.substr(index, r));
        index += r;
    });
    return result.join('-');
}

/**
 * Constructor.
 * Possible to call with 2 parameters:
 *      - dw.order.Order
 *      - Object { 'transaction-type': '...' }
 *      e.g. new Transaction(order, { 'transaction-type': 'debit' })
 * @returns {Object} - self
 */
function Transaction() {
    var args = Array.prototype.slice.call(arguments);
    var self = this;

    args.forEach(function (arg) {
        if (arg instanceof dw.order.Order) { // eslint-disable-line no-undef
            self.order = arg;
        } else if (typeof arg === 'object') {
            Object.keys(arg).forEach(function (aKey) {
                self[aKey] = arg[aKey];
            });
        }
    });
    if (!self.order) {
        throw new Error('Order is required for creating transaction!');
    }
    if (!self.paymentMethodID) {
        // get payment data from order
        self.paymentMethodID = this.getPaymentMethodID(self.order);
    }

    return this;
}

/**
 * Set custom field
 * @param {string} name - custom field-name
 * @param {mixed} value - custom field-value
 * @returns {Object}
 */
Transaction.prototype.setCustomField = function (name, value) {
    var customFields = this.customFields || [];
    customFields.push({ 'field-name': String(name).trim(), 'field-value': String(value).trim() });
    this.customFields = customFields;
    return this;
};

/**
 * Get payment method id
 * @param {dw.order.Order}
 * @returns {string}
 */
Transaction.prototype.getPaymentMethodID = function (order) {
    var orderHelper = require('~/cartridge/scripts/paymentgateway/helper/OrderHelper');
    var paymentData = orderHelper.getPaymentGatewayOrderPayment(order);
    // this.paymentInstrument = paymentData.paymentInstrument;
    var paymentMethodID = paymentData.paymentMethodID;
    // TODO map paymentMethodID e.g. "PG_PAYPAL" to "paypal"
    if (!paymentMethodID) {
        throw new Error('No payment gateway payment method used for current order!');
    }
    return paymentMethodID;
};

/**
 * Helper function borrowed from local function
 * @param {string} key - site preference name
 * @returns {string}
 */
Transaction.prototype.getSitePreference = getSitePreference;

/**
 * Check if extended request parameters have to be sent for current transaction
 * @returns {boolean}
 */
Transaction.prototype.hasReducedPayload = function () {
    var self = this;
    var result = false;
    if (self['transaction-type'] && Type.Follow.indexOf(self['transaction-type']) > -1) {
        result = true;
    }
    return result;
};

/**
 * Retrieve order data: order items, shipping & billing address
 * @returns {Object}
 */
Transaction.prototype.getOrderData = function () {
    var self = this;
    var result = {};

    // for backend operations we can omit order parameters
    var OrderEntity = require('./entity/Order');
    if (!self.hasReducedPayload()) {
        // locale, entry-mode
        var customerLocale = self.order.customerLocaleID;
        if (/^\w{2}_\w{2}$/.test(customerLocale)) {
            result.locale = customerLocale.substr(0, 2);
        }
        result['entry-mode'] = 'ecommerce';
        var descriptor = new (require('./entity/Descriptor'))(self);
        Object.keys(descriptor).forEach(function (k) {
            result[k] = descriptor[k];
        });

        if (this.getSitePreference('sendAdditionalData')) {
            result['ip-address'] = self.order.remoteHost;
            result.device = { fingerprint: session.sessionID };
        }

        var orderData = new (OrderEntity)(self);
        Object.keys(orderData).forEach(function (k) {
            result[k] = orderData[k];
        });
        // redirect urls
        var redirectUrls = new (require('./entity/RedirectUrls'))(self.order);
        Object.keys(redirectUrls).forEach(function (k) {
            result[k] = redirectUrls[k];
        });
    } else {
        if (Number(self['requested-amount']) !== 0) { // eslint-disable-line
            // either transaction amount is only part of..
            result['requested-amount'] = {
                value: Number(self['requested-amount']).toFixed(2),
                currency: self.order.currencyCode
            };
        } else {
            // ..or complete order amount
            var totalOrderAmount = OrderEntity.getFixedContainerTotalAmount(self.order);
            result['requested-amount'] = {
                value: totalOrderAmount.value,
                currency: totalOrderAmount.currencyCode
            };
        }
    }
    return result;
};

/**
 * Retrieve request body json
 * @returns {Object}
 * @throws {Error} - if no transaction-type / merchant-account-id set
 */
Transaction.prototype.getPayload = function () {
    var self = this;
    // START setting default properties
    var result = {};
    result['request-id'] = getRequestID(self.order);
    result['payment-methods'] = {
        'payment-method': [{
            name: self.paymentMethodID
        }]
    };

    // set transaction-type if provided with constructor call
    if (Object.prototype.hasOwnProperty.call(self, 'transaction-type')) {
        result['transaction-type'] = String(self['transaction-type']);
    }
    // set merchant-account-id if provided with constructor call
    if (Object.prototype.hasOwnProperty.call(self, 'merchant-account-id')) {
        result['merchant-account-id'] = {
            value: String(self['merchant-account-id'])
        };
    }

    // add order data
    var orderData = self.getOrderData();
    Object.keys(orderData).forEach(function (k) {
        result[k] = orderData[k];
    });
    // custom-fields
    if (Object.prototype.hasOwnProperty.call(self, 'customFields')) {
        result['custom-fields'] = { 'custom-field': self.customFields };
    }
    // parent transactionID
    if (Object.prototype.hasOwnProperty.call(self, 'parent-transaction-id')) {
        result['parent-transaction-id'] = String(self['parent-transaction-id']);
    }
    if (!result['transaction-type']) {
        throw new Error('No transaction-type provided!');
    }
    if (!result['merchant-account-id']) {
        throw new Error('No merchant-account-id provided!');
    }
    return { payment: result };
};

/**
 * Retrieve cancellation transaction type
 * @returns {Object|false}
 */
Transaction.prototype.getBackendOperationForCancel = function () {
    try {
        var operation = this.getCancelTransactionType();
        return {
            label: Resource.msg('text_cancel_transaction', 'paymentgateway', null),
            action: operation.type,
            amount: { decimalValue: 0 }
        };
    } catch (err) {
        return false;
    }
};

/**
 * Retrieve capture transaction type
 * @returns {Object|false}
 */
Transaction.prototype.getBackendOperationForCapture = function () {
    var self = this;
    try {
        var operation = this.getCaptureTransactionType();

        var maxAmount = self['requested-amount'] || 0;
        var capturedAmount = Number(self.order.custom.paymentGatewayCapturedAmount);
        if (capturedAmount < maxAmount) {
            maxAmount -= capturedAmount;
        } else {
            throw new Error('maximum possible amount already captured!');
        }
        return {
            label: Resource.msg('text_capture_transaction', 'paymentgateway', null),
            action: operation.type,
            amount: new Money(maxAmount, self.order.currencyCode),
            partialAllowed: Object.prototype.hasOwnProperty.call(operation, 'partialAllowed')
        };
    } catch (err) {
        return false;
    }
};

/**
 * Retrieve refund transaction type
 * @returns {Object|false}
 */
Transaction.prototype.getBackendOperationForRefund = function () {
    var self = this;
    try {
        var operation = this.getRefundTransactionType();

        var maxAmount = self['requested-amount'] || 0;
        var refundedAmount = Object.prototype.hasOwnProperty.call(self, 'refunded-amount') ? self['refunded-amount'] : 0;
        if (refundedAmount < maxAmount) {
            maxAmount -= refundedAmount;
        } else {
            throw new Error('maximum possible amount already refunded!');
        }
        return {
            label: Resource.msg('text_refund_transaction', 'paymentgateway', null),
            action: operation.type,
            amount: new Money(maxAmount, self.order.currencyCode),
            partialAllowed: Object.prototype.hasOwnProperty.call(operation, 'partialAllowed')
        };
    } catch (err) {
        return false;
    }
};

/**
 * Retrieve possible backend operations for current transaction
 * @param {boolean} canCancel - if order can be cancelled
 * @returns {Array}
 */
Transaction.prototype.getBackendOperations = function (canCancel) {
    var operations = [];
    var captureActions = this.getBackendOperationForCapture();
    if (canCancel && captureActions) {
        operations.push(captureActions);
    }
    var cancelActions = this.getBackendOperationForCancel();
    if (canCancel && cancelActions) {
        operations.push(cancelActions);
    }
    var refundActions = this.getBackendOperationForRefund();
    if (canCancel && refundActions) {
        operations.push(refundActions);
    }
    return operations;
};

module.exports = Transaction;
