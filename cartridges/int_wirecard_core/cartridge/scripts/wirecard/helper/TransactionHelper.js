'use strict';
/* API includes */
var wcLogger = require('dw/system/Logger').getLogger('wirecard');

// transfer object base path
var transferObjectBasePath = '*/cartridge/scripts/wirecard/transferObjects/';
// service class base path
var svcBasePath = '*/cartridge/scripts/wirecard/services/';

var TransactionHelper = {
    OPERATION_CANCEL: 'cancel',
    OPERATION_CAPTURE: 'capture',
    OPERATION_REFUND: 'refund',

    getUrlServiceMethods: [
        'WCD_IDEAL',
        'WCD_SOFORT'
    ],

    /**
     * Retrieve wirecard transaction data from dw.order.Order
     *
     * @param {dw.order.Order}
     * @returns {Object}
     */
    getWirecardTransactionDataFromOrder: function(order) {
        var transactionData = {};
        var orderHelper = require('*/cartridge/scripts/wirecard/helper/OrderHelper');

        // TODO remove dummy data
        var Money = require('dw/value/Money');
        var ArrayList = require('dw/util/ArrayList');
        transactionData.paymentMethodID = 'Paypal';
        transactionData.createdAt = new Date();
        transactionData.transactionID = 'HAHG-GH89-BHG3';
        transactionData.parentTransactionID = 'DFAH-898J-JJA5';
        transactionData.action = 'authorization';
        transactionData.transactionState = 'success';
        transactionData.rawResponse = '<?xml version="1.0" encoding="UTF-8"?>'
                           + '<payment xmlns="http://www.elastic-payments.com/schema/payment">'
                           + 'tbd'
                           + '</payment>';
        var amount = new Money(120.29, 'EUR');
        transactionData.amount = amount;
        transactionData.currency = amount.currencyCode;
        var allowedOperations = new ArrayList();
        allowedOperations.push(this.OPERATION_CANCEL);
        allowedOperations.push(this.OPERATION_CAPTURE);
        allowedOperations.push(this.OPERATION_REFUND);
        transactionData.allowedOperations = allowedOperations;
        // END dummy data

        return transactionData;
    }
};

module.exports = TransactionHelper;
