'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type').All;

var preferenceMapping = {
    addDescriptorToRequest: 'paymentGatewayGiropayAddDescriptorToRequest',
    sendAdditionalData: 'paymentGatewayGiropaySendAdditionalData'
};

/**
 * Constructor.
 * @param {dw.order.Order} order - current order
 * @param {Object} args - additional parameter
 * @returns {Object} - transaction
 */
function Giropay(order, args) {
    // default params
    var params = {
        paymentMethodID: require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper').PAYMENT_METHOD_GIROPAY,
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

    return this;
}

Giropay.prototype = Object.create(Transaction.prototype);

/**
 * Add bank-account data saved from payment form with orderPaymentInstrument
 */
Giropay.prototype.getCustomPayload = function () {
    var paymentHelper = require('int_wirecard_core/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');
    var instruments = this.order.getPaymentInstruments('PG_GIROPAY');
    var result = {};

    if (!instruments.empty) {
        var customPaymentData = {};

        Object.keys(instruments[0].custom).forEach(function (key) {
            customPaymentData[key] = instruments[0].custom[key];
        });
        result = paymentHelper.getDataForRequest(customPaymentData, 'PG_GIROPAY');
    }
    return result;
};

module.exports = Giropay;
