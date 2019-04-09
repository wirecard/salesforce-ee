'use strict';

/**
 * Api includes
 */
var Money = require('dw/value/Money');
var Resource = require('dw/web/Resource');

var Item = require('../Item');

/**
 * Creates object with transactional coupon data
 * @param {Object} transaction - current transaction
 * @returns {Object} - order coupon data (json)
 */
function getCouponData(transaction) {
    var couponItems = [];
    var order = transaction.order;
    var paymentMethodID = transaction.paymentMethodID;

    var couponIterator = order.couponLineItems.iterator();
    while (couponIterator.hasNext()) {
        var coupon = couponIterator.next();
        var priceAdjustments = coupon.getPriceAdjustments().iterator();
        var itemData;

        while (priceAdjustments.hasNext()) {
            var priceAdjustment = priceAdjustments.next();
            var proratedPrices = priceAdjustment.proratedPrices;
            if (proratedPrices.size() > 1) {
                var proratedProducts = proratedPrices.keySet();
                var proratedProductsIterator = proratedProducts.iterator();
                while (proratedProductsIterator.hasNext()) {
                    var prLineItem = proratedProductsIterator.next();
                    var ppItem = proratedPrices.get(prLineItem);
                    if (ppItem.value != 0) {
                        var taxValue = new Money(
                            ppItem.value - ppItem.value * 100 / (prLineItem.taxRate * 100 + 100),
                            ppItem.currencyCode
                        );
                        itemData = {
                            name: coupon.couponCode,
                            description: Resource.msg('coupon.sku', 'paymentoperator', null),
                            'article-number': Resource.msg('coupon.sku', 'paymentgateway', null),
                            quantity: 1,
                            'tax-rate': prLineItem.taxRate,
                            'tax-amount': taxValue.value,
                            currency: ppItem.currencyCode,
                            amount: ppItem.value
                        };
                        couponItems.push(new Item(itemData, paymentMethodID));
                    }
                }
            } else {
                var couponAmount = priceAdjustment.getGrossPrice();
                itemData = {
                    name: coupon.couponCode,
                    description: Resource.msg('coupon.sku', 'paymentgateway', null),
                    'article-number': Resource.msg('coupon.sku', 'paymentgateway', null),
                    quantity: 1,
                    'tax-rate': priceAdjustment.taxRate.toFixed(2),
                    'tax-amount': priceAdjustment.getTax().value,
                    currency: couponAmount.currencyCode,
                    amount: couponAmount.value
                };
                couponItems.push(new Item(itemData, paymentMethodID));
            }
        }
    }
    return couponItems;
}

/**
 * Constructor.
 * @returns {Object} - order coupons (json)
 */
function Coupon(transaction) {
    return getCouponData(transaction);
}

module.exports = Coupon;
