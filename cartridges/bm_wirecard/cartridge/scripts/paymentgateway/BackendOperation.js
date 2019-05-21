'use strict';

(function (exports) {
    /* API includes */
    var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');
    var StringUtils = require('dw/util/StringUtils');

    /**
     * Create api request json & call service
     * @param {dw.order.Order} order - current order
     * @param {Object} data - holds { transactionId: ..., action: ..., amount: ..., merchantAccountId: ... }
     * @returns {Object}
     */
    function callService(order, data) {
        var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
        var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');

        var paymentData = orderHelper.getPaymentGatewayOrderPayment(order);
        var methodName = paymentData.paymentMethodID;
        var mappedTransactionData = transactionHelper.mapTransactionType(methodName, data.action);
        var merchantAccountId = data.merchantAccountId;
        if (Object.prototype.hasOwnProperty.call(mappedTransactionData, 'merchantAccountId')) {
            merchantAccountId = mappedTransactionData.merchantAccountId;
        }
        var transaction = transactionHelper.getTransaction(
            mappedTransactionData.methodName,
            order,
            {
                'transaction-type'     : data.action,
                'parent-transaction-id': data.transactionId,
                'requested-amount'     : data.amount,
                'merchant-account-id'  : merchantAccountId
            }
        );
        var paymentService = transactionHelper.getPaymentService(methodName, mappedTransactionData.type);

        var result;
        var errorMsg;
        if (transaction && paymentService) {
            paymentService.call(transaction.getPayload());
            result = paymentService.getResponse();
            // save transaction
            if (Object.prototype.hasOwnProperty.call(result, 'transactionId')) {
                transactionHelper.saveTransactionToOrder(order, result);
            } else {
                throw new Error('Server-Error: transaction failed!');
            }
        } else {
            errorMsg = StringUtils.format(
                'Operation [{0}] failed for [{1}] - no transaction / service class found',
                data.action,
                data.transactionId
            );
            pgLogger.error(errorMsg);
            throw new Error(errorMsg);
        }
        return result;
    }

    exports.callService = callService;
}(module.exports));
