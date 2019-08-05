/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/**
 * Processes notifications stored in custom objects "PaymentGatewayNotification"
 * @param {Object} notification - custom object with type PaymentGatewayNotification
 */
exports.process = function (notification) {
    var Order = require('dw/order/Order');
    var OrderMgr = require('dw/order/OrderMgr');
    var Transaction = require('dw/system/Transaction');
    var order = OrderMgr.getOrder(notification.custom.orderNo);

    if (order) {
        var orderStatus = order.status.value;

        // save payment transaction
        var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
        transactionHelper.saveBackendTransaction(order, JSON.parse(notification.custom.transactionData), true);

        // TODO place order depending on transaction-type
        if (orderStatus === Order.ORDER_STATUS_CREATED) {
            // Places the order
            var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
            var placeOrderResult = COHelpers.placeOrder(order, {});
            if (placeOrderResult.error) {
                Transaction.wrap(function () {
                    OrderMgr.failOrder(order, false);
                });
            }
            // send order confirmation email
            COHelpers.sendConfirmationEmail(order, order.customerLocaleID);
        }
    }
};
