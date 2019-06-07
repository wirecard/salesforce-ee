/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

(function (exports) {
    /* API includes */
    var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');
    var StringUtils = require('dw/util/StringUtils');

    /**
     * Check if there's a follow-up transaction for the provided failed transaction
     * @param {string} methodName - payment method name
     * @param {Object} transaction - executed transaction
     * @returns {boolean|string} - false if no follow-up transaction otherwise its type
     */
    function checkFollowUpTransaction(methodName, transaction) {
        var FollowMapping = require('*/cartridge/scripts/paymentgateway/transaction/Type').FollowMapping();
        // FIXME this may apply to other payment methods as well..
        if (['PG_CREDITCARD'].indexOf(methodName) > -1
            && transaction.transactionState !== 'success'
            && Object.keys(FollowMapping).indexOf(transaction.transactionType) > -1
        ) {
            return FollowMapping[transaction.transactionType];
        }
        return false;
    }

    /**
     * Create api request json & call service
     *
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
                'merchant-account-id'  : merchantAccountId,
                originalPaymentMethod  : methodName
            }
        );
        let apiEndpoint = transaction.getApiEndpointFromTransactionType();

        if (!apiEndpoint) {
            apiEndpoint = mappedTransactionData.type;
        }
        var paymentService = transactionHelper.getPaymentService(methodName, apiEndpoint);

        var result;
        var errorMsg;
        if (transaction && paymentService) {
            paymentService.call(transaction.getPayload());
            result = paymentService.getResponse();
            // save transaction
            if (Object.prototype.hasOwnProperty.call(result, 'transactionId')) {
                transactionHelper.saveTransactionToOrder(order, result);

                // special handling for credit card / void-purchase / void-capture
                var followUpTransactionType = checkFollowUpTransaction(methodName, result);
                if (followUpTransactionType) {
                    // create copy of original backend service data
                    var followUpData = {};
                    Object.keys(data).forEach(function (key) {
                        followUpData[key] = data[key];
                    });
                    followUpData.action = followUpTransactionType;
                    result = callService(order, followUpData);
                }
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
