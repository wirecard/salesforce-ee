/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var Site = require('dw/system/Site').getCurrent();
var controllerCartridge = Site.getCustomPreferenceValue('paymentGatewayControllerCartridgeName');

/* Script Modules */
var app = require(controllerCartridge + '/cartridge/scripts/app');

/* API includes */
var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');
var Resource = require('dw/web/Resource');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');

/**
 * Processes notifications stored in custom objects "PaymentGatewayNotification"
 * @param {Object} notification - custom object with type PaymentGatewayNotification
 */
exports.process = function (notification) {
    /* API includes */
    var Order = require('dw/order/Order');
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(notification.custom.orderNo);

    if (order) {
        /* script includes */
        var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
        // save payment transaction
        transactionHelper.saveBackendTransaction(order, JSON.parse(notification.custom.transactionData), true);

        var orderStatus = order.status.value;
        // TODO place order depending on transaction-type
        if (notification.custom.transactionState === 'success' && orderStatus === Order.ORDER_STATUS_CREATED) {
            try {
                Transaction.begin();
                var placeOrderStatus = OrderMgr.placeOrder(order);
                if (placeOrderStatus === Status.ERROR) {
                    OrderMgr.failOrder(order, false);
                    throw new Error('Failed to place order.');
                }
                order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                order.setExportStatus(Order.EXPORT_STATUS_READY);

                // Creates gift certificates for all gift certificate line items in the order
                // and sends an email to the gift certificate receiver
                var GiftCertificate = app.getModel('GiftCertificate');
                order.getGiftCertificateLineItems().toArray().map(function (lineItem) {
                    return GiftCertificate.createGiftCertificateFromLineItem(lineItem, order.getOrderNo());
                }).forEach(GiftCertificate.sendGiftCertificateEmail);

                Transaction.commit();
                // send order confirmation email
                var Email = app.getModel('Email');
                Email.sendMail({
                    template : 'mail/orderconfirmation',
                    recipient: order.getCustomerEmail(),
                    subject  : Resource.msg('order.orderconfirmation-email.001', 'order', null),
                    context  : {
                        Order: order
                    }
                });
            } catch (err) {
                Transaction.rollback();
                pgLogger.error('Error while placing order #' + order.orderNo + '\n'
                     + err.fileName + ': ' + err.message + '\n' + err.stack);
            }
        }
    }
};
