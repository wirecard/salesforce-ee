'use strict';

/* API includes */
var Transaction = require('dw/system/Transaction');
var PaymentInstrument = require('dw/order/PaymentInstrument');

/* Script includes */
var packageJson = require('int_wirecard_controllers/package.json');
var controllerCartridge = packageJson.controllerCartridge;
var app = require(controllerCartridge + '/cartridge/scripts/app');

/**
 * holds form ids for payment methods to reset if not selected
 */
var resetPaymentForms = {
    PG_GIROPAY: 'PG_GIROPAY',
    PG_IDEAL  : 'PG_IDEAL'
};

// default payment methods
resetPaymentForms[PaymentInstrument.METHOD_BML] = 'bml';
resetPaymentForms[PaymentInstrument.METHOD_CREDIT_CARD] = 'creditCard';

/**
 * Removes the other payment methods.
 * @return {Boolean} Returns true if payment is successfully reset.
 */
function removePaymentInstrumentsFromBasket() {
    var cart = app.getModel('Cart').get();
    var paymentMethods = app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.options;

    var status = Transaction.wrap(function () {
        for (var paymentMethodIndex in paymentMethods) {
            var paymentMethod = paymentMethods[paymentMethodIndex];
            if (paymentMethod.value !== app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value
                && paymentMethod.value !== 'GIFT_CERTIFICATE'
            ) {
                cart.removePaymentInstruments(cart.getPaymentInstruments(paymentMethod.value));
            }
        }

        // reset po method form
        for (var paymentMethodName in resetPaymentForms) {
            if (paymentMethodName !== app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value) {
                var paymentMethodFormIndex = resetPaymentForms[paymentMethodName];

                var formelement = app.getForm('billing').object.paymentMethods[paymentMethodFormIndex];
                if (formelement) {
                    formelement.clearFormElement();
                }
            }
        }

        return true;
    });

    return status;
}

exports.removePaymentInstrumentsFromBasket = removePaymentInstrumentsFromBasket;
