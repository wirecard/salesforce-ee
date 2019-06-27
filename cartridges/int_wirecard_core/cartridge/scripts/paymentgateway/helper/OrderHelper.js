/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/**
 * Retrieve payment gateway payment instrument data from dw.order.Order
 * @param {dw.order.Order}
 * @returns {Object}
 */
exports.getPaymentGatewayOrderPayment = function (order) {
    var result = { paymentMethodID: '' };

    var paymentInstruments = order.paymentInstruments.iterator();
    while (paymentInstruments.hasNext()) {
        var instrument = paymentInstruments.next();
        if (instrument.getPaymentMethod().indexOf('PG_', 0) > -1) {
            result.paymentMethodID = instrument.getPaymentMethod();
            result.paymentInstrument = instrument;
        }
    }
    return result;
};

/**
 * Calculate fingerprint with order parameters and merchant secret
 * @param {dw.order.Order}
 * @returns {string}
 */
exports.getOrderFingerprint = function (order, orderNo) {
    var Mac = require('dw/crypto/Mac');
    var Site = require('dw/system/Site').getCurrent();
    var secret = Site.getCustomPreferenceValue('paymentGatewayUrlSalt');
    var hashParams = [];

    if (orderNo) {
        hashParams.push(orderNo);
    } else {
        hashParams.push(order.orderNo);
    }

    /* product line item data */
    var plis = order.getAllProductLineItems();
    var plisIterator = plis.iterator();
    while (plisIterator.hasNext()) {
        var pli = plisIterator.next();
        hashParams.push(pli.productID);
        hashParams.push(pli.quantity.value);
    }

    /* customer data */
    var billingAddress = order.getBillingAddress();
    hashParams.push(billingAddress.getLastName());
    hashParams.push(billingAddress.getFirstName());
    hashParams.push(billingAddress.getAddress1());
    hashParams.push(billingAddress.getPostalCode());
    hashParams.push(billingAddress.getCity());

    var mac = new Mac(Mac.HMAC_SHA_512);
    var digest = mac.digest(hashParams.join('|'), secret);
    return require('dw/crypto/Encoding').toHex(digest);
};

exports.getPaymentGatewayOrderStateFromTransactionType = function(order, transaction) {
    const Type         = require('*/cartridge/scripts/paymentgateway/transaction/Type');
    const SystemObjMgr = require('dw/object/SystemObjectMgr');
    const orderStates  = SystemObjMgr
        .describe('Order')
        .getCustomAttributeDefinition("paymentGatewayOrderState")
        .getValues()
        .toArray();
    const filterOrderStates = function(orderState) {
        return orderState.value === this.toString();
    };
    switch (transaction.transactionType) {
        case Type.All.AUTHORIZATION:
            return orderStates.filter(filterOrderStates, 'authorized').shift().value;
        case Type.All.CHECK_ENROLLMENT:
            return orderStates.filter(filterOrderStates, 'open').shift().value;
        case Type.All.PENDING_DEBIT:
            return orderStates.filter(filterOrderStates, 'pending').shift().value;
        case Type.All.VOID_AUTHORIZATION:
            return orderStates.filter(filterOrderStates, 'cancelled').shift().value;
        case Type.All.PURCHASE:
            return orderStates.filter(filterOrderStates, 'processing').shift().value;
        default:
            if (Type.Capture.indexOf(transaction.transactionType) > -1) {
                return orderStates.filter(filterOrderStates, 'paid').shift().value;
            }
            if (Type.Refund.indexOf(transaction.transactionType) > -1) {
                const OrderEntity    = require('*/cartridge/scripts/paymentgateway/transaction/entity/Order');
                const orderAmount    = OrderEntity.getFixedContainerTotalAmount(order);
                const refundedAmount = order.custom.paymentGatewayRefundedAmount;

                return 0 < refundedAmount && refundedAmount < orderAmount
                    ? orderStates.filter(filterOrderStates, 'partiallyRefunded').shift().value
                    : orderStates.filter(filterOrderStates, 'refunded').shift().value;
            }
            throw new Error('Invalid transaction type');
    }

};
