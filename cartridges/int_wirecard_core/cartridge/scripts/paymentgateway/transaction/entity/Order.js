'use strict';

var AbstractEntity = require('./Abstract');
var BillingAddress = require('./Order/BillingAddress');
var Coupons = require('./Order/Coupons');
var GiftCertificateLineItems = require('./Order/GiftCertificateLineItems');
var PriceAdjustments = require('./Order/PriceAdjustments');
var ProductLineItems = require('./Order/ProductLineItems');
var Shipping = require('./Order/Shipping');
var ShippingAddress = require('./Order/ShippingAddress');

/**
 * Retrieve order total amount
 * @param {dw.order.Order}
 * @returns {dw.value.Money}
 */
function getFixedContainerTotalAmount(order) {
    var amount;
    var adjustedPrice;
    var Money = require('dw/value/Money');
    // fetch amount from payment instrument
    var instruments = order.getPaymentInstruments();
    var iter = instruments.iterator();
    while (iter.hasNext()) {
        var instrument = iter.next();
        if (instrument.getPaymentMethod().indexOf('PG_', 0) > -1) {
            adjustedPrice = instrument.paymentTransaction.amount;
        }
    }
    if (adjustedPrice != null && adjustedPrice.isAvailable()) {
        amount = adjustedPrice;
    } else {
        amount = new Money(0, order.getCurrencyCode());
    }
    return amount;
}

/**
 * Constructor.
 * @param {Object} transaction - current transaction
 * @returns {Object} - order data (json)
 */
function Order(transaction) {
    var result = {};

    var order = transaction.order;
    var totalOrderAmount = getFixedContainerTotalAmount(order);
    result['requested-amount'] = {
        value: totalOrderAmount.value,
        currency: totalOrderAmount.currencyCode
    };
    result['order-number'] = order.orderNo;

    if (this.getSitePreference('paymentGatewaySendBasketData')) {
        var shipping = new Shipping(transaction);
        var productLineItems = new ProductLineItems(transaction);
        var coupons = new Coupons(transaction);
        var giftCertificateLineItems = new GiftCertificateLineItems(transaction);
        var priceAdjustments = new PriceAdjustments(transaction);

        var orderItems = [].concat(
            coupons,
            giftCertificateLineItems,
            priceAdjustments,
            productLineItems,
            shipping
        );
        result['order-items'] = { 'order-item': orderItems };
    }

    if (this.getSitePreference('paymentGatewaySendAdditionalData')) {
        result['account-holder'] = new BillingAddress(transaction);
        result.shipping = new ShippingAddress(transaction);
    } else {
        // account-holder is mandatory
        result['account-holder'] = new BillingAddress(transaction, true);
    }

    return result;
}

Order.getFixedContainerTotalAmount = getFixedContainerTotalAmount;

Order.prototype = Object.create(AbstractEntity.prototype);

module.exports = Order;
