/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var paymentHelper = require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');

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

    if ([paymentHelper.PAYMENT_METHOD_PAYPAL].indexOf(paymentMethod) > -1 && itemData['tax-amount'] > 0) {
        item['tax-amount'] = {
            currency: itemData.currency,
            value: Number(itemData['tax-amount']).toFixed(2)
        };
    } else if ([paymentHelper.PAYMENT_METHOD_RATEPAY].indexOf(paymentMethod) > -1) {
        item['tax-rate'] = Number(itemData['tax-rate']) * 100;
    }
    return item;
}

module.exports = Item;
