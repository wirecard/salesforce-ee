'use strict';

var OrderEntity = require('../entity/Order');

/**
 * Constructor.
 * @param {Object} transaction - current transaction
 * @returns {Object} - seamless order data (json)
 */
function Order(transaction) {
    var result = {};
    var orderData = new (OrderEntity)(transaction);
    var tmp;

    Object.keys(orderData).forEach(function (k) {
        tmp = orderData[k];
        if (k === 'order-items') {
            var orderItems = tmp['order-item'];
            for (var i = 0; i < orderItems.length; i += 1) {
                var orderItem = orderItems[i];
                result['orderItems' + (i + 1) + '.name'] = orderItem.name;
                result['orderItems' + (i + 1) + '.quantity'] = orderItem.quantity;
                result['orderItems' + (i + 1) + '.articleNumber'] = orderItem.articleNumber;
                result['orderItems' + (i + 1) + '.amount.value'] = orderItem.amount.value;
                result['orderItems' + (i + 1) + '.amount.currency'] = orderItem.amount.currency;
            }
        } else if (k === 'account-holder') {
            result.first_name = tmp['first-name'];
            result.last_name = tmp['last-name'];
            result.street1 = tmp.address.street1;
            result.city = tmp.address.city;
            result.postal_code = tmp.address['postal-code'];
            result.country = tmp.address.country;
            if (Object.prototype.hasOwnProperty.call(tmp, 'phone')) {
                result.phone = tmp.phone;
            }
        } else if (k === 'shipping') {
            result.shipping_first_name = tmp['first-name'];
            result.shipping_last_name = tmp['last-name'];
            result.shipping_street1 = tmp.address.street1;
            result.shipping_city = tmp.address.city;
            result.shipping_postal_code = tmp.address['postal-code'];
            if (Object.prototype.hasOwnProperty.call(tmp, 'phone')) {
                result.shipping_phone = tmp.phone;
            }
        } else if (k === 'requested-amount') {
            result.requested_amount = String(tmp.value);
            result.requested_amount_currency = tmp.currency;
        } else {
            var kk = k.replace(/-/g, '_');
            result[kk] = tmp;
        }
    });
    return result;
}

module.exports = Order;
