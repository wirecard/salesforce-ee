'use strict';

/**
 * Api includes
 */
var Resource = require('dw/web/Resource');

var Item = require('../Item');

/**
 * Creates object with transactional giftCertificate lineItem data
 * @param {Object} transaction - current transaction
 * @returns {Object} - order giftCertificate lineItem data (json)
 */
function getGiftCertificateLineItems(transaction) {
    var order = transaction.order;
    var paymentMethodID = transaction.paymentMethodID;
    var giftCertificateLineItems = [];

    var gplis = order.getGiftCertificateLineItems();
    if (gplis) {
        for (var i = 0; i < gplis.length; i++) {
            var gpli = gplis[i];
            var itemData = {
                name: gpli.lineItemText,
                description: gpli.message || '',
                'article-number': Resource.msg('giftcertificate.sku', 'paymentgateway', null),
                quantity: 1,
                amount: Number(gpli.getGrossPrice().value).toFixed(0),
                currency: order.currencyCode,
                'tax-rate': 0,
                'tax-amount': (gpli.tax.value).toFixed(2)
            };
            giftCertificateLineItems.push(new Item(itemData, paymentMethodID));
        }
    }
    return giftCertificateLineItems;
}

/**
 * Constructor.
 * @returns {Object} - order gift certificate lineItems (json)
 */
function GiftCertificateLineItems(transaction) {
    return getGiftCertificateLineItems(transaction);
}

module.exports = GiftCertificateLineItems;
