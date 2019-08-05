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

var preferenceMapping = {
    addDesc: 'paymentGatewayEpsAddDescriptorToRequest',
    sendAdditionalData: 'paymentGatewayEpsSendAdditionalData'
};

/**
 * Constructor.
 * @param {dw.order.Order} order - current order
 * @param {Object} args - additional parameter
 * @returns {Object} - transaction
 */
function Eps(order, args) {
    // default params
    var params = {
        paymentMethodID: require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper').PAYMENT_METHOD_EPS,
        'transaction-type': Type.DEBIT,
        'merchant-account-id': this.getSitePreference('paymentGatewayEpsMerchantAccountID')
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

Eps.prototype = Object.create(Transaction.prototype);

/**
 * Add bank-account data saved from payment form with orderPaymentInstrument
 */
Eps.prototype.getCustomPayload = function () {
    var paymentHelper = require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');
    var instruments = this.order.getPaymentInstruments('PG_EPS');
    var result = {};

    if (!instruments.empty) {
        var customPaymentData = {};

        Object.keys(instruments[0].custom).forEach(function (key) {
            customPaymentData[key] = instruments[0].custom[key];
        });
        result = paymentHelper.getDataForRequest(customPaymentData, 'PG_EPS');
    }
    return result;
};

module.exports = Eps;
