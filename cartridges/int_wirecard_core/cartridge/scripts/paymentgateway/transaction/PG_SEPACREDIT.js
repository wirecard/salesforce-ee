'use strict';

var Transaction = require('./Transaction');
var Type = require('./Type');

/**
 * Constructor.
 * @param {dw.order.Order} order - current order
 * @param {Object} args - additional parameter
 * @returns {Object} - transaction
 */
function SEPACredit(order, args) {
    // default params
    var params = {
        paymentMethodID: require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper').PAYMENT_METHOD_SEPA_CREDIT,
        'transaction-type': Type.All.CREDIT,
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

var orgGetOrderData = Transaction.prototype.getOrderData;
/**
 * Extend getOrderData method: limit refund amount to amount that was initially authorized
 * @returns {Object} - order data
 */
Transaction.prototype.getOrderData = function () {
    var self = this;
    var result = orgGetOrderData.apply(this);
    if (self['transaction-type'] === Type.All.CREDIT
        && Object.prototype.hasOwnProperty.call(self, 'originalPaymentMethod')
        && self.originalPaymentMethod === 'PG_SOFORT'
    ) {
        var order = self.order;
        var Money = require('dw/value/Money');
        var OrderEntity = require('./entity/Order');

        var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
        var allTransactions = transactionHelper.getPaymentGatewayTransactionDataFromOrder(order);
        var allTransactionsIterator = allTransactions.iterator();
        var refundedAmount = 0;

        while (allTransactionsIterator.hasNext()) {
            var tmpTransaction = allTransactionsIterator.next();
            if (tmpTransaction.parentTransactionId == self['parent-transaction-id']
                && Type.Refund.indexOf(tmpTransaction.transactionType) > -1
                && tmpTransaction.transactionState === 'success'
            ) {
                refundedAmount += tmpTransaction.amount.value;
            }
        }
        refundedAmount = new Money(refundedAmount, order.currencyCode);
        var maxTransactionAmount = OrderEntity.getFixedContainerTotalAmount(order).subtract(refundedAmount);
        if (result['requested-amount'].value > maxTransactionAmount.value) {
            result['requested-amount'].value = maxTransactionAmount.value;
        }
    }
    return result;
};

SEPACredit.prototype = Object.create(Transaction.prototype);

module.exports = SEPACredit;
