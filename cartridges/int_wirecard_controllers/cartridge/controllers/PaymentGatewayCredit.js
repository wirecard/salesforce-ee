'use strict';

var packageJson = require('int_wirecard_controllers/package.json');
var controllerCartridge = packageJson.controllerCartridge;

/* Script Modules */
var app = require(controllerCartridge + '/cartridge/scripts/app');
var guard = require(controllerCartridge + '/cartridge/scripts/guard');


/**
 * Responsible for payment handling. This function uses PaymentProcessorModel methods to
 * handle payment processing specific to each payment instrument. It returns an
 * error if any of the authorizations failed or a payment
 * instrument is of an unknown payment method. If a payment method has no
 * payment processor assigned, the payment is accepted as authorized.
 *
 * @transactional
 * @param {dw.order.Order} order - the order to handle payments for.
 * @return {Object} JSON object containing information about missing payments, errors, or an empty object if the function is successful.
 */
function handlePayments(order) {
    if (order.getTotalNetPrice() !== 0.00) {
        var paymentInstruments = order.getPaymentInstruments();

        if (paymentInstruments.length === 0) {
            return {
                missingPaymentInfo: true
            };
        }
        var PaymentMgr = require('dw/order/PaymentMgr');
        var Transaction = require('dw/system/Transaction');
        var PaymentProcessor = app.getModel('PaymentProcessor');

        /**
         * Sets the transaction ID for the payment instrument.
         */
        var handlePaymentTransaction = function () {
            paymentInstrument.getPaymentTransaction().setTransactionID(order.getOrderNo()); // eslint-disable-line
        };

        for (var i = 0; i < paymentInstruments.length; i++) {
            var paymentInstrument = paymentInstruments[i];
            if (PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor() === null) {
                Transaction.wrap(handlePaymentTransaction);
            } else {
                var authorizationResult = PaymentProcessor.authorize(order, paymentInstrument);
                if (authorizationResult.not_supported || authorizationResult.error) {
                    return {
                        error   : true,
                        errorMsg: authorizationResult.errorMessage
                    };
                }
            }
        }
    }

    return {};
}

/**
 * Create order and credit card request data
 */
exports.RequestData = guard.ensure(['get', 'https'], function () {
    var result = {};
    var cart = app.getModel('Cart').get();

    try {
        if (!cart) {
            throw new Error('Cart is empty!');
        }

        var Transaction = require('dw/system/Transaction');
        var COShipping = app.getController('COShipping');
        // Clean shipments.
        COShipping.PrepareShipments(cart);

        // Make sure there is a valid shipping address, accounting for gift certificates that do not have one.
        if (cart.getProductLineItems().size() > 0 && cart.getDefaultShipment().getShippingAddress() === null) {
            throw new Error('No shipping address provided!');
        }

        // Make sure the billing step is fulfilled, otherwise restart checkout.
        if (!session.forms.billing.fulfilled.value) {
            throw new Error('Billing form data is invalid!');
        }

        Transaction.wrap(function () {
            cart.calculate();
        });

        var COBilling = app.getController('COBilling');

        Transaction.wrap(function () {
            if (!COBilling.ValidatePayment(cart)) {
                throw new Error('Invalid payment data!');
            }
        });

        // Recalculate the payments. If there is only gift certificates, make sure it covers the order total, if not
        // back to billing page.
        Transaction.wrap(function () {
            if (!cart.calculatePaymentTransactionTotal()) {
                throw new Error('Error while calculating cart total!');
            }
        });

        var OrderMgr = require('dw/order/OrderMgr');
        var order = cart.createOrder();

        if (!order) {
            throw new Error('Error while creating order!');
        }
        var handlePaymentsResult = handlePayments(order);
        if (handlePaymentsResult.error) {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order);
            });
            throw new Error('Error while processing payment!');
        }

        // start preparing embedded payment data
        var locale = 'en'; // fallback
        if (/^\w{2}_\w{2}$/.test(request.locale)) {
            locale = request.locale.substr(0, 2);
        }
        var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
        var params = {
            locale          : locale,
            remoteHost      : request.httpRemoteAddress,
            appendSuccessUrl: true,
            customFields: [
                { name: 'fp', value: orderHelper.getOrderFingerprint(order) }
            ]
        };

        var transaction = new (require('*/cartridge/scripts/paymentgateway/transaction/PG_CREDITCARD_REQUESTDATA'))(order, params);
        result = transaction.getPayload();
    } catch (err) {
        result.error = err.message;
    }
    response.setContentType('application/json');
    response.writer.println(JSON.stringify(result, null, 2));
});

/**
 * Re-entry point after 3DS authentication
 */
exports.TermUrl = guard.ensure(['https'], function () {
    var parameterMap = request.httpParameterMap;
    var orderNo = parameterMap.orderNo.value;
    var orderToken = parameterMap.orderSec.value;

    var OrderMgr = require('dw/order/OrderMgr');
    var URLUtils = require('dw/web/URLUtils');
    var order = OrderMgr.getOrder(orderNo);

    // TODO verify request integrity (signed-json / xmlsig)
    if (order && orderToken) {
        // clear sessions as in COPlaceorder.clearForms
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
 * Re-entry point for failure handling
 */
exports.Fail = guard.ensure(['https'], function () {
    var parameterMap = request.httpParameterMap;
    var orderNo = parameterMap.orderNo.value;
    var orderToken = parameterMap.orderSec.value;

    var URLUtils = require('dw/web/URLUtils');
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNo);

    if (order && order.orderToken == orderToken) {
        require('dw/system/Transaction').wrap(function () {
            OrderMgr.failOrder(order);
        });

        var errorObject;
        if (parameterMap.status_code_1.value && parameterMap.status_description_1.value) {
            errorObject = {
                PaymentGatewayError: {
                    code       : parameterMap.status_code_1.value,
                    description: parameterMap.status_description_1.value
                }
            };
        } else {
            var Status = require('dw/system/Status');
            errorObject = {
                PlaceOrderError: {
                    error          : true,
                    PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
                }
            };
        }

        app.getController('COSummary').Start(errorObject);
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
        var transactionHelper = require('*/cartridge/scripts/paymentgateway/helper/TransactionHelper');
        var notifyMessage = parameterMap.getRequestBodyAsString();
        var notifyData = transactionHelper.parseTransactionResponse(notifyMessage, null);
        require('*/cartridge/scripts/paymentgateway/transaction/Logger').log(JSON.parse(notifyMessage), 'notify');

        var fingerprint;
        var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
        if (Object.prototype.hasOwnProperty.call(notifyData, 'customFields')
            && Object.prototype.hasOwnProperty.call(notifyData.customFields, 'fp')
        ) {
            fingerprint = notifyData.customFields.fp;
        }

        // FIXME verify signature (xmlsig)
        if (fingerprint === orderHelper.getOrderFingerprint(order)) {
            var CustomObjectMgr = require('dw/object/CustomObjectMgr');
            Transaction.begin();
            // save notification as custom object
            var customObj = CustomObjectMgr.getCustomObject('PaymentGatewayNotification', notifyData.transactionId);
            if (!customObj) {
                customObj = CustomObjectMgr.createCustomObject('PaymentGatewayNotification', notifyData.transactionId);
            }
            customObj.custom.responseText = notifyMessage;
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
