'use strict';

/**
 * Wrapper function for creating order item object
 * @param {Object} itemData - data of lineitem of different types
 * @param {string} paymentMethod - order payment method
 * @returns {Object} - item data (json)
 */
function Item(itemData, paymentMethod) {
    var item = {};
    [
        'amount',
        'name',
        'description',
        'article-number',
        'quantity'
    ].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(itemData, key)) {
            if (key === 'amount') {
                item[key] = {
                    currency: itemData.currency,
                    value: Number(itemData.amount).toFixed(2)
                };
            } else {
                item[key] = itemData[key];
            }
        }
    });

    if (/paypal/.test(paymentMethod) && itemData['tax-amount'] > 0) {
        item['tax-amount'] = {
            currency: itemData.currency,
            value: Number(itemData['tax-amount']).toFixed(2)
        };
    } else if (/ratepay/.test(paymentMethod)) {
        item['tax-rate'] = itemData.taxRate;
    }
    return item;
}

module.exports = Item;
