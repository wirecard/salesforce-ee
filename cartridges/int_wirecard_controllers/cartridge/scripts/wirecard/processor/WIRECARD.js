'use strict';

var packageJson         = require('int_wirecard_controllers/package.json');
var controllerCartridge = packageJson.controllerCartridge;

/* API Includes */
var wcLogger = require('dw/system/Logger').getLogger('wirecard');

var Cart = require(controllerCartridge + '/cartridge/scripts/models/CartModel');
var app = require(controllerCartridge + '/cartridge/scripts/app');

/**
 * Creates PaymentInstrument and returns 'success'.
 */
function Handle(args) {
    var cart            = Cart.get(args.Basket);
    var paymentMethodId = args.PaymentMethodID;

    require('dw/system/Transaction').wrap(function () {
        cart.removeExistingPaymentInstruments(paymentMethodId);
        cart.createPaymentInstrument(paymentMethodId, cart.getNonGiftCertificateAmount());
    });

    return {success: true};
}

/**
 * Authorize Wirecard Payment.
 */
function Authorize(args) {
    // FIXME use more generic way to extract form data already in this step
    var formData = app.getForm('billing');
    var order = args.Order;

    var orderHelper = require('*/cartridge/scripts/wirecard/helper/OrderHelper');
    var paymentData = orderHelper.getWirecardOrderPayment(order);
    var paymentInstrument = paymentData.paymentInstrument;

    try {
        // handles all wirecard payments except credit card (seamless integration)
        var redirectPayment = require('*/cartridge/scripts/wirecard/RedirectPayment');
        var responseData = redirectPayment.callService(paymentData.paymentMethodID, order, paymentInstrument, formData);

        var resultObj = responseData.getObject();

        if (!resultObj) {
            if (responseData.error != 'undefined') {
                wcLogger.error('Error ({0}): {1}', responseData.error, responseData.errorMessage);
            }

            throw new Error('The result object is empty.');
        }
    } catch (err) {
        wcLogger.error('Exception while processing the API-Call: ' + err.fileName + ': ' + err.message + '\n' + err.stack);

        return {error: true, errorMessage: err};
    }

    if (resultObj.error) {
        return {error: true, errorMessage: resultObj.msg};
    }

    // TODO here the transaction data would have to be saved with the order

    return {redirect: true, url: resultObj.redirectUrl};
}

exports.Handle = Handle;
exports.Authorize = Authorize;
