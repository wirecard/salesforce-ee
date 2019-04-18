'use strict';

/* API includes */
var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');

// transaction base path
var transactionBasePath = '*/cartridge/scripts/paymentgateway/transaction/';
// service class base path
var svcBasePath = '*/cartridge/scripts/paymentgateway/services/';

var TransactionHelper = {
    /**
     * Retrieve payment gateway transaction data from dw.order.Order
     * @param {dw.order.Order}
     * @returns {Object}
     */
    getPaymentGatewayTransactionDataFromOrder: function (order) {
        var ArrayList = require('dw/util/ArrayList');
        var transactionData = new ArrayList();
        var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
        var paymentData = orderHelper.getPaymentGatewayOrderPayment(order);

        var Money = require('dw/value/Money');

        for (var i = 0; i < order.custom.paymentGatewayTransactions.length; i++) {
            var transaction = JSON.parse(order.custom.paymentGatewayTransactions[i]);
            var createdAt = new Date(transaction.completionTimeStamp);
            var requestedAmount = transaction.requestedAmount;
            var capturedAmount = order.custom.paymentGatewayCapturedAmount || 0;
            var refundedAmount = order.custom.paymentGatewayRefundedAmount || 0;

            transactionData.push({
                transactionId: transaction.transactionId,
                parentTransactionId: transaction.parentTransactionId,
                transactionState: transaction.transactionState,
                transactionType: transaction.transactionType,
                merchantAccountId: transaction.merchantAccountId,
                paymentMethodID: paymentData.paymentMethodID,
                amount: new Money(requestedAmount.value, requestedAmount.currency),
                capturedAmount: new Money(capturedAmount, requestedAmount.currency),
                refundedAmount: new Money(refundedAmount, requestedAmount.currency),
                createdAt: createdAt
            });
        }

        return transactionData;
    },

    /**
     * Retrieve data for a single transaction
     * @param {dw.order.Order} - related order
     * @param {string} transactionId - as provided by payment gateway
     * @returns {Object}
     */
    getPaymentGatewayTransactionData: function (order, transactionId) {
        var StringUtils = require('dw/util/StringUtils');
        var Type = require('*/cartridge/scripts/paymentgateway/transaction/Type');

        var transactionData;
        var allTransactions = this.getPaymentGatewayTransactionDataFromOrder(order);
        var allTransactionsIterator = allTransactions.iterator();
        var canCancel = true;
        var refundedAmount = 0;

        while (allTransactionsIterator.hasNext()) {
            var tmpTransaction = allTransactionsIterator.next();
            if (tmpTransaction.transactionId == transactionId) {
                transactionData = tmpTransaction;
            } else if (tmpTransaction.parentTransactionId == transactionId
                && Type.Cancel.indexOf(tmpTransaction.transactionType) > -1
                && tmpTransaction.transactionState === 'success'
            ) {
                canCancel = false;
            } else if (tmpTransaction.parentTransactionId == transactionId
                && Type.Refund.indexOf(tmpTransaction.transactionType) > -1
                && tmpTransaction.transactionState === 'success'
            ) {
                refundedAmount += tmpTransaction.amount.value;
            }
        }
        if (!transactionData) {
            throw new Error(
                StringUtils.format('No transaction found with {0} for orderNo {1}', transactionId, order.orderNo)
            );
        }

        var transaction = this.getTransaction(
            transactionData.paymentMethodID,
            order,
            {
                'requested-amount': transactionData.amount.value,
                'transaction-type': transactionData.transactionType,
                'refunded-amount': refundedAmount
            }
        );
        transactionData.allowedOperations = transaction.getBackendOperations(canCancel);
        var partialAllowedOperations = [];
        transactionData.allowedOperations.forEach(function (item) {
            if (Object.prototype.hasOwnProperty.call(item, 'partialAllowed')) {
                partialAllowedOperations.push(item.action);
            }
        });
        transactionData.partialAllowedOperations = partialAllowedOperations;
        return transactionData;
    },

    /**
     * Try to get transaction instance for given method
     * @param {string} methodName - current payment method name
     * @param {dw.order.Order} order - order placed with payment method
     * @returns {null|Object} - instance of transaction class or null if nothing found
     */
    getTransaction: function (methodName, order) {
        var transaction = null;
        // fetch optional arguments
        /*
         * Object with properties - e.g.
         * { parentTransactionId: 1223 }
         */
        var args = Array.prototype.slice.call(arguments, 2);
        var params = {};
        if (args.length > 0 && typeof args[0] === 'object') {
            params = args[0];
        }

        var path = transactionBasePath + methodName;
        try {
            transaction = new (require(path))(order, params);
        } catch (err) {
            pgLogger.error('No transaction class found for : ' + methodName + ', in: ' + path + '\n'
                + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        return transaction;
    },

    /**
     * Try to get service class for given method
     * @param {string} methodName - current payment method name
     * @param {string} type - either "payments" or "paymentmethods"
     * @returns {Object} - instance of service class
     */
    getPaymentService: function (methodName, type) {
        var svcClass = null;
        var path = svcBasePath + methodName;

        try {
            svcClass = require(path)(type);
        } catch (err) {
            pgLogger.error('No service class found for : ' + methodName + ', in: ' + path + '\n'
                + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        return svcClass;
    },

    /**
     * Parse transaction status from http response object
     * @param {string} apiErrorText - http client error text
     * @returns {Object} - status with { code: ..., description: ... }
     */
    parseTransactionStatus: function (apiErrorText) {
        // FIXME return general error?
        var result = { code: '999.999999', description: 'General technical error' };
        var dataObject = JSON.parse(apiErrorText);
        if (Object.prototype.hasOwnProperty.call(dataObject, 'payment')
            && Object.prototype.hasOwnProperty.call(dataObject.payment, 'statuses')
            && Object.prototype.hasOwnProperty.call(dataObject.payment.statuses, 'status')
            && dataObject.payment.statuses.status.length > 0
        ) {
            result = dataObject.payment.statuses.status[0];
        }
        return result;
    },

    /**
     * Save transaction with order
     * @param {dw.order.Order} order - related order
     * @param {Object} newTransaction - transaction data
     * @param {boolean} overwrite - if true replaces preceding initial transaction
     * @returns {Object}
     */
    saveTransactionToOrder: function (order, newTransaction, overwrite) {
        var ArrayList = require('dw/util/ArrayList');
        var Transaction = require('dw/system/Transaction');

        var allPaymentTransactions = new ArrayList();
        var savedTransactions = order.custom.paymentGatewayTransactions;
        var updatedTransaction = false;

        for (var i = 0; i < savedTransactions.length; i++) {
            var transaction = JSON.parse(savedTransactions[i]);

            if (transaction.transactionId == newTransaction.transactionId) {
                if (overwrite) {
                    // replace backend transaction with notification response
                    allPaymentTransactions.push(JSON.stringify(newTransaction));
                    updatedTransaction = true;
                }
            } else if (!transaction.parentTransactionId
                && newTransaction.parentTransactionId == transaction.transactionId
            ) {
                // replace initial transaction with notification response
                allPaymentTransactions.push(JSON.stringify(newTransaction));
                updatedTransaction = true;
            } else {
                // keep all other transactions
                allPaymentTransactions.push(JSON.stringify(transaction));
            }
        }
        // if no transaction was updated then add the newTransaction
        if (!updatedTransaction) {
            allPaymentTransactions.push(JSON.stringify(newTransaction));
        }
        Transaction.wrap(function () {
            order.custom.paymentGatewayTransactions = allPaymentTransactions;
        });
    },

    /**
     * Save capture / refund amount
     * @param {dw.order.Order} order - current order
     * @param {Object} transaction - transaction data
     * @param {boolean} overwrite - if true replaces preceding initial transaction
     */
    saveBackendTransaction: function (order, transaction, overwrite) {
        var Transaction = require('dw/system/Transaction');
        var Type = require('*/cartridge/scripts/paymentgateway/transaction/Type');

        if (transaction.transactionState === 'success') {
            if (Type.Capture.indexOf(transaction.transactionType) > -1) {
                var alreadyCaptured = order.custom.paymentGatewayCapturedAmount || 0;
                Transaction.wrap(function () {
                    order.custom.paymentGatewayCapturedAmount = parseFloat(alreadyCaptured) + parseFloat(transaction.requestedAmount.value);
                });
            }
            if (Type.Refund.indexOf(transaction.transactionType) > -1) {
                var alreadyRefunded = order.custom.paymentGatewayRefundedAmount || 0;
                Transaction.wrap(function () {
                    order.custom.paymentGatewayRefundedAmount = parseFloat(alreadyRefunded) + parseFloat(transaction.requestedAmount.value);
                });
            }
            Transaction.wrap(function () {
                order.custom.paymentGatewayOrderState = require('~/cartridge/scripts/paymentgateway/helper/OrderHelper')
                    .getPaymentGatewayOrderStateFromTransactionType(order, transaction);
            });
        }
        // finally save transaction with order
        this.saveTransactionToOrder(order, transaction, overwrite);
    },

    /**
     * Parse api response from http service call
     * @param {string} apiResponse - json response
     * @returns {Object} - status with {code: ..., description: ... }
     */
    parseTransactionResponse: function (apiResponse, paymentMethodID) {
        var result = {};
        var resultObject = JSON.parse(apiResponse);
        var stringHelper = require('*/cartridge/scripts/paymentgateway/util/StringHelper');
        var tmp;

        [
            'statuses',
            'request-id',
            'merchant-account-id',
            'transaction-type',
            'transaction-state',
            'transaction-id',
            'completion-time-stamp',
            'requested-amount',
            'payment-methods',
            'parent-transaction-id',
            'custom-fields'
        ].forEach(function (key) {
            var resultKey = stringHelper.camelize(key);
            if (Object.prototype.hasOwnProperty.call(resultObject.payment, key)) {
                if (key === 'merchant-account-id') {
                    result[resultKey] = resultObject.payment[key].value;
                } else if (key === 'payment-methods'
                    && resultObject.payment[key]['payment-method']
                    && resultObject.payment[key]['payment-method'].length > 0
                ) {
                    tmp = resultObject.payment[key]['payment-method'].filter(function (m) { // eslint-disable-line array-callback-return
                        if (m.name == paymentMethodID) return m;
                    });
                    if (tmp.length > 0) {
                        ['name', 'url'].forEach(function (k) {
                            if (Object.prototype.hasOwnProperty.call(tmp[0], k)) {
                                var tmpKey = k === 'url' ? 'redirectURL' : 'paymentMethodId';
                                result[tmpKey] = tmp[0][k];
                            }
                        });
                    }
                } else if (key === 'statuses'
                    && resultObject.payment[key].status
                    && resultObject.payment[key].status.length > 0
                ) {
                    // FIXME ok to grab only first status?
                    tmp = resultObject.payment[key].status[0];
                    result.status = tmp;
                } else if (key === 'custom-fields' && Object.prototype.hasOwnProperty.call(resultObject.payment[key], 'custom-field')) {
                    tmp = resultObject.payment[key]['custom-field'];
                    var cName;
                    result[resultKey] = {};
                    tmp.forEach(function (cField) {
                        cName = cField['field-name'];
                        result[resultKey][cName] = cField['field-value'];
                    });
                } else {
                    result[resultKey] = resultObject.payment[key];
                }
            }
        });
        return result;
    }
};

module.exports = TransactionHelper;
