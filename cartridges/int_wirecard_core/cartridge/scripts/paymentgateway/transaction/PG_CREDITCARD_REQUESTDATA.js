'use strict';

var Site = require('dw/system/Site').getCurrent();

var preferenceMapping = {
    addDescriptorToRequest: 'paymentGatewayCreditCardAddDescriptorToRequest',
    sendAdditionalData: 'paymentGatewayCreditCardSendAdditionalData',
    sendBasketData: 'paymentGatewayCreditCardSendBasketData',
    hashSecret: 'paymentGatewayCreditCardSecret',
    merchantAccountId: 'paymentGatewayCreditCardMerchantAccountID',
    initialTransactionType: 'paymentGatewayCreditCardInitialTransactionType'
};

/**
 * @var {array} hashFields - fields used for calculating hash
 */
var hashFields = [
    'request_time_stamp',
    'request_id',
    'merchant_account_id',
    'transaction_type',
    'requested_amount',
    'requested_amount_currency',
    'redirect_url',
    'custom_css_url',
    'ip_address'
];

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
 * Calculate request signature
 * @param {Object} transactionData - request data object
 * @returns {string}
 */
function getSignature(transactionData) {
    var hashParams = [];
    hashFields.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(transactionData, key)) {
            hashParams.push(transactionData[key]);
        }
    });
    hashParams.push(getSitePreference('hashSecret'));

    var Bytes = require('dw/util/Bytes');
    var MessageDigest = require('dw/crypto/MessageDigest');
    var md = new MessageDigest(MessageDigest.DIGEST_SHA_256);
    var digest = md.digestBytes(new Bytes(hashParams.join('').trim()));
    return require('dw/crypto/Encoding').toHex(digest);
}

/**
 * Create unique request id
 * @param {dw.order.LineItemCtnr} order - current order
 * @returns {string}
 */
function getRequestID(lineItemCtnr) {
    var Mac = require('dw/crypto/Mac');
    var mac = new Mac(Mac.HMAC_SHA_256);
    var timeStamp = new Date().getTime();
    var requestBytes = mac.digest(
        [Site.ID, lineItemCtnr.UUID, timeStamp].join(''),
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
 * Possible to call with multiple parameters:
 *      - dw.order.Basket
 *      - Object { 'transaction-type': '...' }
 *      e.g. new Transaction(basket, { 'transaction-type': 'debit' })
 * @returns {Object} - this transaction object
 */
function CheckoutTransaction() {
    var args = Array.prototype.slice.call(arguments);
    var self = this;

    args.forEach(function (arg) {
        if (arg instanceof dw.order.Basket) { // eslint-disable-line no-undef
            self.order = arg;
        } else if (typeof arg === 'object') {
            Object.keys(arg).forEach(function (aKey) {
                self[aKey] = arg[aKey];
            });
        }
    });
    if (!self.order) {
        throw new Error('Current basket is required for creating transaction!');
    }
    // assign temp orderNo to transaction
    if (self.order.custom.paymentGatewayReservedOrderNo) {
        self.orderNo = self.order.custom.paymentGatewayReservedOrderNo;
    }

    this.preferenceMapping = preferenceMapping;
    return this;
}

/**
 * Retrieve request body json
 * @returns {Object}
 * @throws {Error} - if no transaction-type / merchant-account-id set
 */
CheckoutTransaction.prototype.getPayload = function () {
    var self = this;

    var Calendar = require('dw/util/Calendar');
    var StringUtils = require('dw/util/StringUtils');
    var calendar = new Calendar(new Date());
    calendar.setTimeZone('GMT');
    var result = {
        request_time_stamp: StringUtils.formatCalendar(calendar, 'yyyyMMddHHmmss'),
        request_id: getRequestID(self.order),
        payment_method: 'creditcard',
        transaction_type: getSitePreference('initialTransactionType').value,
        attempt_three_d: false,
        merchant_account_id: getSitePreference('merchantAccountId'),
        locale: self.locale
    };

    // add order data
    var orderData = self.getOrderData();
    Object.keys(orderData).forEach(function (k) {
        result[k] = orderData[k];
    });
    // custom-fields
    if (Object.prototype.hasOwnProperty.call(self, 'customFields')
        && Object.prototype.toString.call(self.customFields) === '[object Array]'
    ) {
        var tmpField;
        for (var i = 0; i < self.customFields.length; i += 1) {
            tmpField = self.customFields[i];
            if (Object.prototype.hasOwnProperty.call(tmpField, 'name')
                && Object.prototype.hasOwnProperty.call(tmpField, 'value')
            ) {
                result['field_name_' + (i + 1)] = tmpField.name;
                result['field_value_' + (i + 1)] = tmpField.value;
            }
        }
    }
    result.request_signature = getSignature(result);

    return result;
};

/**
 * Helper function borrowed from local function
 * @param {string} key - site preference name
 * @returns {string}
 */
CheckoutTransaction.prototype.getSitePreference = getSitePreference;

/**
 * Retrieve order data: line items, shipping & billing address
 * @returns {Object}
 */
CheckoutTransaction.prototype.getOrderData = function () {
    var self = this;
    var result = {};

    var OrderEntity = require('./seamless/Order');
    var descriptor = new (require('./seamless/Descriptor'))(self);
    Object.keys(descriptor).forEach(function (k) {
        result[k] = descriptor[k];
    });

    if (getSitePreference('sendAdditionalData')) {
        result.ip_address = self.remoteHost;
        result.device_fingerprint = session.sessionID;
    }

    var orderData = new (OrderEntity)(self);
    Object.keys(orderData).forEach(function (k) {
        result[k] = orderData[k];
    });
    // notification url
    var notificationUrl = new (require('./seamless/NotificationUrl'))(self.order);
    Object.keys(notificationUrl).forEach(function (k) {
        result[k] = notificationUrl[k];
    });

    return result;
};


module.exports = CheckoutTransaction;
