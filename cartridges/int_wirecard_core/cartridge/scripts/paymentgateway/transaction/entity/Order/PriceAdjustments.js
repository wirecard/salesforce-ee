'use strict';

/**
 * Api includes
 */
var Resource = require('dw/web/Resource');

var Item = require('../Item');

/**
 * Creates object with transactional priceadjustment data
 * @param {Object} transaction - current transaction
 * @returns {Object} - order priceadjustment data (json)
 */
function getPriceAdjustments(transaction) {
    var priceAdjustmentItems = [];
    var order = transaction.order;
    var paymentMethodID = transaction.paymentMethodID;

    var priceAdjustmentsIterator = order.priceAdjustments.iterator();
    while (priceAdjustmentsIterator.hasNext()) {
        var otherPriceAdjustment = priceAdjustmentsIterator.next();
        if (otherPriceAdjustment.basedOnCoupon) {
            continue;
        }

        var adjustmentAmount = otherPriceAdjustment.getGrossPrice();
        var itemData = {
            name: otherPriceAdjustment.promotionID,
            description: Resource.msg('promotion.sku', 'paymentgateway', null),
            'article-number': Resource.msg('promotion.sku', 'paymentgateway', null),
            quantity: 1,
            amount: adjustmentAmount.value,
            currency: adjustmentAmount.currencyCode,
            'tax-rate': otherPriceAdjustment.taxRate.toFixed(2),
            'tax-amount': otherPriceAdjustment.getTax().value
        };
        priceAdjustmentItems.push(new Item(itemData, paymentMethodID));
    }
    return priceAdjustmentItems;
}

/**
 * Constructor.
 * @returns {Object} - order priceadjustments (json)
 */
function PriceAdjustments(transaction) {
    return getPriceAdjustments(transaction);
}

module.exports = PriceAdjustments;
