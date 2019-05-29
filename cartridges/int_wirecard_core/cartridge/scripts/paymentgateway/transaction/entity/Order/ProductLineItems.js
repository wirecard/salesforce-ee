'use strict';

var Item = require('../Item');

/**
 * Creates object with transactional product line item data
 * @param {Object} transaction - current transaction
 * @returns {Object} - order data (json)
 */
function getLineItems(transaction) {
    var orderItems = [];
    var order = transaction.order;
    var paymentMethodID = transaction.paymentMethodID;

    var plis = order.getAllProductLineItems();
    var plisIterator = plis.iterator();
    while (plisIterator.hasNext()) {
        var pli = plisIterator.next();
        var vatRate = pli.getTaxRate() * 100;
        var qty = pli.quantity.value;

        var itemData = {
            name: pli.productName,
            description: pli.product ? pli.product.shortDescription.toString().substr(0, 30) : '',
            'article-number': pli.productID,
            quantity: qty,
            'tax-rate': (vatRate > 0) ? vatRate : 0,
            'tax-amount': (pli.getAdjustedTax().value / qty).toFixed(2),
            currency: order.currencyCode,
            amount: (pli.getAdjustedGrossPrice().value / qty).toFixed(2)
        };
        orderItems.push(new Item(itemData, paymentMethodID));
    }
    return orderItems;
}

/**
 * Constructor.
 * @returns {Object} - order product lineitem data (json)
 */
function ProductLineItems(transaction) {
    return getLineItems(transaction);
}

module.exports = ProductLineItems;
