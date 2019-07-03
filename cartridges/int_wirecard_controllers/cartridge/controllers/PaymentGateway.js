/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var URLUtils = require('dw/web/URLUtils');

var packageJson = require('int_wirecard_controllers/package.json');
var controllerCartridge = packageJson.controllerCartridge;

/* Script Modules */
var app = require(controllerCartridge + '/cartridge/scripts/app');
var guard = require(controllerCartridge + '/cartridge/scripts/guard');

/**
 * Re-entry point for success handling
 */
exports.Success = guard.ensure(['https'], function () {
    var parameterMap = request.httpParameterMap;
    var orderNo = parameterMap.orderNo;
    var orderToken = parameterMap.orderSec;
    // payload comes as xml(!) from wpg
    // var epp = require('dw/util/StringUtils').decodeBase64(parameterMap.eppresponse);

    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNo);

    if (order && order.orderToken == orderToken) {
        // clear checkout forms
        session.forms.singleshipping.clearFormElement();
        session.forms.multishipping.clearFormElement();
        session.forms.billing.clearFormElement();
        app.getController('COSummary').ShowConfirmation(order);
    } else {
        response.redirect(URLUtils.https('Cart-Show'));
    }
    return;
});

/**
 * Re-entry point for cancellation handling
 */
exports.Cancel = guard.ensure(['https'], function () {
    var parameterMap = request.httpParameterMap;
    var orderNo = parameterMap.orderNo.value;
    var orderToken = parameterMap.orderSec.value;

    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNo);

    if (order && order.orderToken == orderToken) {
        require('dw/system/Transaction').wrap(function () {
            OrderMgr.failOrder(order);
        });

        var Resource = require('dw/web/Resource');
        app.getController('COSummary').Start({
            PaymentGatewayError: {
                description: Resource.msg('canceled_payment_process', 'paymentgateway', null)
            }
        });
    } else {
        response.redirect(URLUtils.https('Cart-Show'));
    }
    return;
});

/**
 * Re-entry point for failure handling
 */
exports.Fail = guard.ensure(['https'], function () {
    var parameterMap = request.httpParameterMap;
    var orderNo = parameterMap.orderNo;
    var orderToken = parameterMap.orderSec;

    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNo);

    if (order && order.orderToken == orderToken) {
        var eppResponse = require('*/cartridge/scripts/paymentgateway/util/EppResponse').parseBase64(
            parameterMap.eppresponse,
            require('dw/web/Resource').msg('confirm.error.technical', 'checkout', null)
        );

        require('dw/system/Transaction').wrap(function () {
            OrderMgr.failOrder(order);
        });

        var Status = require('dw/system/Status');
        app.getController('COSummary').Start({
            PaymentGatewayError: {
                description: eppResponse.status.message
            }
        });
        return;
    }
    response.redirect(URLUtils.https('Cart-Show'));
    return;
});

/**
 * For handling of notification request sent by payment gate
 */
exports.Notify = guard.ensure(['post', 'https'], function () {
    var parameterMap = request.httpParameterMap;
    var orderNo = parameterMap.orderNo.value;
    var orderToken = parameterMap.orderSec.value;

    var OrderMgr = require('dw/order/OrderMgr');
    var Transaction = require('dw/system/Transaction');
    var order = OrderMgr.getOrder(orderNo);

    if (order && order.orderToken === orderToken) {
        // parse response
        var requestBody       = parameterMap.getRequestBodyAsString();
        var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
        var notifyData        = transactionHelper.parseTransactionResponse(
            requestBody, null, transactionHelper.RESPONSE_TYPE_NOTIFY
        );
        var rawResponeJson = transactionHelper.getJsonSignedResponseWrapper(requestBody).getJsonResponse();
        require('*/cartridge/scripts/paymentgateway/transaction/Logger').log(rawResponeJson, 'notify');

        if (Object.prototype.hasOwnProperty.call(notifyData, 'transactionId')) {
            var CustomObjectMgr = require('dw/object/CustomObjectMgr');
            Transaction.begin();
            // save notification as custom object
            var customObj = CustomObjectMgr.getCustomObject('PaymentGatewayNotification', notifyData.transactionId);
            if (!customObj) {
                customObj = CustomObjectMgr.createCustomObject('PaymentGatewayNotification', notifyData.transactionId);
            }
            customObj.custom.responseText = JSON.stringify(rawResponeJson);
            customObj.custom.transactionData = JSON.stringify(notifyData);
            customObj.custom.transactionType = notifyData.transactionType;
            customObj.custom.requestedAmount = notifyData.requestedAmount.value;
            customObj.custom.merchantAccountId = notifyData.merchantAccountId;
            customObj.custom.transactionState = notifyData.transactionState;
            customObj.custom.parentTransactionId = notifyData.parentTransactionId;
            customObj.custom.orderNo = order.orderNo;
            Transaction.commit();
        }
    }

    var ISML = require('dw/template/ISML');
    ISML.renderTemplate('paymentgateway/empty', {});
    return {};
});

/**
 * Debug order transaction
 *
 * Possible request params:
 *  - orderNo String order to calculate request object for *required*
 *
 * e.g. PaymentPaygate-Debug?orderNo=00018001
 *
 */
exports.Debug = guard.ensure(['get', 'https'], function () {
    var parameterMap = request.httpParameterMap;

    // use only on test environment
    var System = require('dw/system/System');
    if ([System.DEVELOPMENT_SYSTEM, System.STAGING_SYSTEM].indexOf(System.instanceType) == -1) {
        response.setStatus(404);
        app.getView().render('error/notfound');
        return false;
    }
    var result = {};

    var orderNo = parameterMap.orderNo;
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNo);
    if (!order) {
        result.error = 'No order found with orderNo ' + orderNo;
    } else {
        var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
        var paymentData = orderHelper.getPaymentGatewayOrderPayment(order);

        if (paymentData.paymentMethodID) {
            var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
            var transaction = transactionHelper.getTransaction(paymentData.paymentMethodID.trim(), order);
            var payload = transaction.getPayload();
            result = JSON.stringify(payload, null, 2);
        }
    }
    response.setContentType('application/json');
    response.writer.println(result);
});

