/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/**
 * Controller for payment gateway transactions in business manager
 * @module controllers/PaymentGateway
 */

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

var StringUtils = require('dw/util/StringUtils');
var URLUtils = require('dw/web/URLUtils');
var Logger = require('dw/system/Logger').getLogger('paymentgateway');

/**
 * Renders the transaction overview in business manager
 * @see {@link module:controllers/PaymentGateway~transactions}
 */
exports.Transactions = guard.ensure(['get', 'https'], function () {
    var parameterMap = request.httpParameterMap;
    var pageSize = parameterMap.sz.intValue || 30;
    var start = parameterMap.start.intValue || 0;
    var orderID = parameterMap.OrderID.value;

    var OrderMgr = require('dw/order/OrderMgr');
    var Order = require('dw/order/Order');
    // fetch all orders with payment gateway payment method
    var orderResult;
    if (orderID) {
        orderResult = OrderMgr.queryOrders(
            'custom.paymentGatewayTransactions != NULL AND status != {0} AND UUID = {1}',
            'orderNo desc',
            Order.ORDER_STATUS_FAILED,
            orderID
        );
    } else {
        orderResult = OrderMgr.queryOrders(
            'custom.paymentGatewayTransactions != NULL AND status != {0}',
            'orderNo desc',
            Order.ORDER_STATUS_FAILED
        );
    }

    var PagingModel = require('dw/web/PagingModel');
    var orderPagingModel = new PagingModel(orderResult, orderResult.count);
    orderPagingModel.setPageSize(pageSize);
    orderPagingModel.setStart(start);

    app.getView({
        OrderPagingModel: orderPagingModel
    }).render('paymentgateway/transactions/overview');
});

/**
 * Display single transaction
 */
exports.TransactionDetail = guard.ensure(['get', 'https'], function () {
    var parameterMap = request.httpParameterMap;
    var orderNo = parameterMap.orderNo.value;
    var transactionId = parameterMap.transactionId.value;
    var transactionType = parameterMap.transactionType.value;

    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNo);
    if (!(order instanceof dw.order.Order)) {
        Logger.error('No valid order found for given orderNo!');
        response.redirect(URLUtils.https('PaymentGateway-Transactions'));
    } else {
        var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
        try {
            // fetch possible error message from backend operation failure
            var msg = JSON.parse(session.privacy.paymentGatewayMsg) || {};
            var displayMsg;
            delete session.privacy.paymentGatewayMsg;
            if (Object.prototype.hasOwnProperty.call(msg, 'message')) {
                displayMsg = msg.message;
            }

            var transactionData = transactionHelper.getPaymentGatewayTransactionData(order, transactionId, transactionType);
            app.getView({
                isSuccess  : Object.prototype.hasOwnProperty.call(msg, 'success'),
                Message    : displayMsg,
                Order      : order,
                Transaction: transactionData
            }).render('paymentgateway/transactions/details');
        } catch (err) {
            Logger.error('Error while rendering transaction details \n' + err.fileName + ': ' + err.message + '\n' + err.stack);
            response.redirect(URLUtils.https('PaymentGateway-Transactions'));
        }
    }
});

/**
 * Execute operation for given order & transaction
 */
exports.ExecuteOperation = guard.ensure(['post', 'https'], function () {
    var parameterMap = request.httpParameterMap;
    var orderNo = parameterMap.orderNo.value;
    var transactionId = parameterMap.transactionId.value;
    var transactionType = parameterMap.transactionType.value;
    var operation = parameterMap.operation.value;
    var amount = Number(parameterMap.amount.value);

    var Type = require('*/cartridge/scripts/paymentgateway/transaction/Type');
    var Resource = require('dw/web/Resource');
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNo);

    // default message
    var msg = { message: 'No valid order found for given orderNo!' };

    if (!(order instanceof dw.order.Order)) {
        Logger.error(msg.message);
    } else if (amount === 0 && Type.Cancel.indexOf(operation) === -1) {
        msg.message = Resource.msgf('requested_operation_no_available_for_amount', 'paymentgateway', null, amount, order.currencyCode);
    } else {
        var backendOperation = require('*/cartridge/scripts/paymentgateway/BackendOperation');
        try {
            var result = backendOperation.callService(
                order,
                {
                    action           : operation,
                    amount           : amount,
                    transactionId    : transactionId,
                    merchantAccountId: parameterMap.merchantAccountId.value
                }
            );
            if (result.transactionState !== 'success') {
                msg.message = StringUtils.format(
                    'Operation [{0}] failed: {1}',
                    operation,
                    result.status.description
                );
            } else {
                msg.message = Resource.msg('success_new_transaction', 'paymentgateway', null);
                msg.success = 1;
            }
        } catch (err) {
            Logger.error(
                StringUtils.format(
                    'Error while executing "{0}" for transaction {1}!',
                    operation,
                    transactionId
                )
            );
            msg.message = err.message;
        }
    }
    session.privacy.paymentGatewayMsg = JSON.stringify(msg);
    response.redirect(URLUtils.https('PaymentGateway-TransactionDetail', 'orderNo', orderNo, 'transactionId', transactionId, 'transactionType', transactionType));
});

/**
 * Display http user / password overview
 */
exports.HttpAccessOverview = guard.ensure(['get', 'https'], function () {
    var preferenceHelper = require('*/cartridge/scripts/paymentgateway/PreferencesHelper');
    var httpCredentials = [];
    var preferences;

    [
        { methodName: 'Credit Card', methodID: 'PG_CREDITCARD' },
        { methodName: 'PayPal', methodID: 'PG_PAYPAL' },
        { methodName: 'Sofort.', methodID: 'PG_SOFORT' },
        { methodName: 'SEPA Direct Debit', methodID: 'PG_SEPA' }
    ].forEach(function (p) {
        preferences = preferenceHelper.getPreferenceForMethodID(p.methodID);
        if (Object.prototype.hasOwnProperty.call(preferences, 'userName')) {
            httpCredentials.push({
                methodName: p.methodName,
                methodID  : p.methodID,
                user      : preferences.userName,
                password  : preferences.password,
                baseUrl   : preferences.baseUrl
            });
        }
    });

    app.getView({
        HttpAccessData: httpCredentials
    }).render('paymentgateway/httpaccesstest');
});

/**
 * Check http user / password
 */
exports.HttpAccessTest = guard.ensure(['post', 'https'], function () {
    var parameterMap = request.httpParameterMap;
    var paymentMethodID = parameterMap.methodID.value;

    var preferenceHelper = require('*/cartridge/scripts/paymentgateway/PreferencesHelper');
    var preferences = preferenceHelper.getPreferenceForMethodID(paymentMethodID);

    var result;

    try {
        var service = require('*/cartridge/scripts/paymentgateway/services/TestHttpCredentials')(preferences.userName, preferences.password, preferences.baseUrl);
        result = service.call();
        // 404 means acknowledged otherwise api responds with 401 unauthorized
        if (result.error !== 404) {
            throw new Error(result.errorMessage);
        }
        response.setStatus(200);
    } catch (err) {
        response.setStatus(510);
        Logger.error(
            StringUtils.format(
                'Invalid merchant credentials for {0}\n {1}',
                paymentMethodID,
                result
            )
        );
    }
});

/**
 * Retrieve complete transaction xml
 */
exports.GetTransactionXML = guard.ensure(['post', 'https'], function () {
    var parameterMap = request.httpParameterMap;
    var transactionId = parameterMap.transactionId.value;
    var paymentMethodID = parameterMap.paymentMethodID.value;

    var preferenceHelper = require('*/cartridge/scripts/paymentgateway/PreferencesHelper');
    var preferences = preferenceHelper.getPreferenceForMethodID(paymentMethodID);
    var data = '<?xml version="1.0" encoding="UTF-8"?>'
          + '<payment xmlns="http://www.elastic-payments.com/schema/payment">'
          + 'NO TRANSACTION DATA'
          + '</payment>';

    try {
        var userName = preferences.userName;
        var password = preferences.password;
        var baseUrl = preferences.baseUrl;

        var HashMap = require('dw/util/HashMap');
        var params = new HashMap();
        params.put('merchantAccountID', preferences.merchantAccountID);
        params.put('transactionID', transactionId);

        var service = require('*/cartridge/scripts/paymentgateway/services/GetTransaction')(userName, password, baseUrl);
        var result = service.call(params);
        if (!result || result.status != 'OK') {
            throw new Error('Api-error: ' + Object.prototype.hasOwnProperty.call(result, 'errorMessage') ? result.errorMessage : 'n/a');
        }
        data = result.object;
    } catch (err) {
        Logger.error(
            StringUtils.format(
                'Error while retrieving transaction XML for transactionId {0}\n {1}',
                transactionId,
                err.message
            )
        );
    }
    response.setContentType('application/xml');
    response.writer.print(data);
});

/**
 * Display form to contact support
 */
exports.SupportForm = guard.ensure(['get', 'https'], function () {
    var Site = require('dw/system/Site').getCurrent();

    var msg = JSON.parse(session.privacy.paymentGatewaySupport) || {};
    var displayMsg;
    delete session.privacy.paymentGatewaySupport;
    if (Object.prototype.hasOwnProperty.call(msg, 'message')) {
        displayMsg = msg.message;
    }
    var preferenceHelper = require('*/cartridge/scripts/paymentgateway/PreferencesHelper');

    app.getView({
        defaultSender: Site.getCustomPreferenceValue('customerServiceEmail') || '',
        methods      : preferenceHelper.getAllPreferences(),
        Message      : displayMsg,
        isSuccess    : Object.prototype.hasOwnProperty.call(msg, 'success')
    }).render('paymentgateway/support/form');
});

/**
 * Send email to wirecard support
 */
exports.SupportFormPost = guard.ensure(['post', 'https'], function () {
    var parameterMap = request.httpParameterMap;

    var HashMap = require('dw/util/HashMap');
    var Mail = require('dw/net/Mail');
    var Resource = require('dw/web/Resource');
    var Site = require('dw/system/Site').getCurrent();
    var Status = require('dw/system/Status');
    var Template = require('dw/util/Template');
    var preferenceHelper = require('*/cartridge/scripts/paymentgateway/PreferencesHelper');

    var template = new Template('paymentgateway/support/email');
    var context = new HashMap();
    var msg = { message: Resource.msg('success_email', 'paymentgateway', null) };
    var supportEmailAddress = Site.getCustomPreferenceValue('paymentGatewaySupportEmail');

    try {
        context.put('comments', parameterMap.comments.value || '');
        context.put('replyTo', parameterMap.replyTo.value || '');
        context.put('version', Site.getCustomPreferenceValue('paymentGatewayModuleVersion'));
        context.put('methodConfigurations', preferenceHelper.getAllPreferences());

        var content = template.render(context);
        var mail = new Mail();
        mail.addTo(supportEmailAddress);
        mail.setFrom(parameterMap.emailSender.value || Site.getCustomPreferenceValue('customerServiceEmail'));
        mail.setSubject(Resource.msg('support_email_title', 'paymentgateway', null));
        mail.setContent(content);
        var status = mail.send();
        if (status.status === Status.OK) {
            msg.success = 1;
        }
    } catch (err) {
        msg.message = Resource.msg('error_email', 'paymentgateway', null);
        Logger.error(msg.message + '\n' + err.fileName + ': ' + err.message + '\n' + err.stack);
    }
    session.privacy.paymentGatewaySupport = JSON.stringify(msg);
    response.redirect(URLUtils.https('PaymentGateway-SupportForm'));
});

/**
 * Show terms and conditions
 */
exports.TermsAndConditions = guard.ensure(['get', 'https'], function () {
    app.getView().render('paymentgateway/support/termsandconditions');
});
