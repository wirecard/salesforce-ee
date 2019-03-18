'use strict';

/**
 * Controller for wirecard transactions in business manager
 *
 *
 * @module controllers/Wirecard
 */

/* Script Modules */
var app   = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

var URLUtils = require('dw/web/URLUtils');
var Logger = require('dw/system/Logger').getLogger('wirecard');

/*
 * Exposed methods.
 */

/**
 * Renders the transaction overview in business manager
 * @see {@link module:controllers/Wirecard~transactions}
 */
exports.Transactions = guard.ensure(['get', 'https'], function() {
    var parameterMap = request.httpParameterMap;
    var pageSize = parameterMap.sz.intValue || 30;
    var start = parameterMap.start.intValue || 0;

    var OrderMgr = require('dw/order/OrderMgr');
    var Order = require('dw/order/Order');
    // fetch all orders with wirecard payment method
    // TODO filter for custom attribute custom.wirecardTransactionID not NULL
    var orderResult : SeekableIterator = OrderMgr.queryOrders(
        "(paymentStatus = {0} OR paymentStatus = {1}) AND (status = {2} OR status = {3})",
        "orderNo desc",
        Order.PAYMENT_STATUS_NOTPAID,
        Order.PAYMENT_STATUS_PARTPAID,
        Order.ORDER_STATUS_NEW,
        Order.ORDER_STATUS_OPEN
    );

    var PagingModel = require('dw/web/PagingModel');
    var orderPagingModel = new PagingModel(orderResult, orderResult.count);
    orderPagingModel.setPageSize(pageSize);
    orderPagingModel.setStart(start);

    app.getView({
        OrderPagingModel: orderPagingModel
    }).render('wirecard/transactions/overview');
});

/**
 * Display single transaction
 */
exports.TransactionDetail = guard.ensure(['get', 'https'], function() {
    var parameterMap = request.httpParameterMap;
    var orderNo = parameterMap.orderNo;

    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNo);
    if (!order instanceof dw.order.Order) {
        Logger.error('No valid order found for given orderNo!');
        response.redirect(URLUtils.https('Wirecard-Single'));
    } else {
        var transactionHelper = require('*/cartridge/scripts/wirecard/helper/TransactionHelper');
        var transactionData = transactionHelper.getWirecardTransactionDataFromOrder(order);
        app.getView({
            Order: order,
            Transaction: transactionData
        }).render('wirecard/transactions/details');
    }
});

/**
 * Execute operation for provided order
 */
exports.ExecuteOperation = guard.ensure(['post', 'https'], function() {
    // TODO csrf protection?
    var parameterMap = request.httpParameterMap;
    var orderNo = parameterMap.orderNo;
    var operation = parameterMap.operation;
    // FIXME check for valid operation type

    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNo);
    if (!order instanceof dw.order.Order) {
        Logger.error('No valid order found for given orderNo!');
    }
    response.redirect(URLUtils.https('Wirecard-TransactionDetail', 'orderNo', orderNo));
});
