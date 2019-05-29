'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type').All;

/**
 * Constructor.
 * @param {dw.order.Order} order - current order
 * @param {Object} args - additional parameter
 * @returns {Object} - transaction
 */
function SEPACredit(order, args) {
    // default params
    var params = {
        paymentMethodID: 'sepacredit',
        'transaction-type': Type.CREDIT,
        'merchant-account-id': this.getSitePreference('paymentGatewaySEPACreditMerchantAccountID')
    };
    if (typeof args === 'object') {
        Object.keys(args).forEach(function (k) {
            params[k] = args[k];
        });
    }
    var transaction = new Transaction(order, params);
    transaction.preferenceMapping = {};

    return transaction;
}

SEPACredit.prototype = Object.create(Transaction.prototype);

module.exports = SEPACredit;
