'use strict';

/**
 * Api includes
 */
var Resource = require('dw/web/Resource');

var Item = require('../Item');

/**
 * Creates object with transactional shipping (method) data
 * @param {Object} transaction - current transaction
 * @returns {Object} - order data (json)
 */
function getShipping(transaction) {
    var shippingItems = [];
    var order = transaction.order;
    var paymentMethodID = transaction.paymentMethodID;

    var shipments = order.shipments.iterator();
    while (shipments.hasNext()) {
        var shipment = shipments.next();
        if (!shipment.shippingMethod) {
            continue;
        }

        // determine shipping tax rate
        var taxClassID = shipment.shippingMethod.taxClassID;
        var TaxMgr = require('dw/order/TaxMgr');
        var ShippingLocation = require('dw/order/ShippingLocation');
        var shippingLocation = ShippingLocation(shipment.shippingAddress);
        var taxJurisdictionID = TaxMgr.getTaxJurisdictionID(shippingLocation);
        var taxRate = TaxMgr.getTaxRate(taxClassID, taxJurisdictionID);

        var itemData = {
            name: shipment.shippingMethod.displayName,
            description: Resource.msg('shipping.sku', 'paymentgateway', null),
            'article-number': Resource.msg('shipping.sku', 'paymentgateway', null),
            quantity: 1,
            amount: shipment.shippingTotalGrossPrice.value,
            currency: shipment.shippingTotalGrossPrice.currencyCode,
            'tax-rate': taxRate,
            'tax-amount': shipment.shippingTotalTax.value
        };
        shippingItems.push(new Item(itemData, paymentMethodID));
    }
    return shippingItems;
}

/**
 * Creates object with transactional shipping discount data
 * @param {Object} transaction - current transaction
 * @returns {Object} - shipping discount (json)
 */
function getShippingDiscounts(transaction) {
    var shippingDiscounts = [];
    var order = transaction.order;
    var paymentMethodID = transaction.paymentMethodID;

    var shippingExclDiscounts = order.shippingTotalPrice;
    var shippingInclDiscounts = order.getAdjustedShippingTotalPrice();
    var shippingDiscount = shippingExclDiscounts.subtract(shippingInclDiscounts);

    if (shippingDiscount && shippingDiscount.value > 0) {
        var itemData = {
            name: Resource.msg('shippingdiscount.sku', 'paymentgateway', null),
            description: Resource.msg('order.ordersummary.ordershippingdiscount', 'order', null),
            'article-number': Resource.msg('shippingdiscount.sku', 'paymentgateway', null),
            quantity: 1,
            amount: (shippingDiscount).toFixed(),
            currency: order.currencyCode,
            'tax-rate': 0,
            'tax-amount': 0
        };
        shippingDiscounts.push(new Item(itemData, paymentMethodID));
    }
    return shippingDiscounts;
}

/**
 * Constructor.
 * @returns {Object} - order shipping with possible discounts (json)
 */
function Shipping(transaction) {
    return [].concat(
        getShipping(transaction),
        getShippingDiscounts(transaction)
    );
}

module.exports = Shipping;
