'use strict';

(function (exports) {
    /* API includes */
    var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var Transaction = require('dw/system/Transaction');

    /**
     * If it is a payment gateway payment method - create transaction,
     * service class and execute api call
     *
     * @param {string} methodName - name of payment method
     * @param {dw.order.Order} order - current order
     * @param {dw.order.PaymentInstrument} paymentInstrument - order paymentinstrument
     * @param {Object} formData - billing form data for used payment method
     * @returns {Object}
     */
    function callService(methodName, order, paymentInstrument, formData) {
        var result = { error: true };

        var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
        var transaction = transactionHelper.getTransaction(methodName, order);
        var paymentService = transactionHelper.getPaymentService(methodName);

        if (transaction && paymentService) {
            var errorMessage = ['Error while payment authorization [' + methodName + '] : '];

            var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
            transaction.setCustomField('fp', orderHelper.getOrderFingerprint(order));
            // TODO add payment form data may be required for some payment methods
            paymentService.call(transaction.getPayload());
            result = paymentService.getResponse();

            if (!result) {
                var responseError = transactionHelper.parseTransactionStatus(paymentService.client.errorText);
                errorMessage.push(responseError.code + ': ' + responseError.description);
                pgLogger.error(errorMessage.join(''));
                throw new Error(responseError.description);
            }

            // handle result
            if (result.transactionState !== 'success') {
                pgLogger.error('Authorization failed for [' + methodName + '] - transaction status : ' + result.transactionState);
                throw new Error(result.status.description || errorMessage.join(''));
            }

            // adding information to PaymentInstrument
            var paymentTransaction = paymentInstrument.getPaymentTransaction();
            var paymentProcessor = PaymentMgr.getPaymentMethod(
                paymentInstrument.getPaymentMethod()).getPaymentProcessor();

            Transaction.wrap(function () {
                paymentTransaction.setPaymentProcessor(paymentProcessor);
                paymentTransaction.setTransactionID(order.getOrderNo());
            });
        } else {
            pgLogger.error('Error while payment authorization - no transaction / service class for ' + methodName);
            throw new Error('Error while payment authorization!');
        }
        return result;
    }

    exports.callService = callService;
}(module.exports));
