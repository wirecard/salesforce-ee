'use strict';

/* API Includes */
var Transaction   = require('dw/system/Transaction');
var PaymentHelper = require('int_wirecard_core/cartridge/scripts/paymentgateway/helper/PaymentHelper.js');
/**
 *
 * @param args
 * @constructor
 */
function Handle(args) {
    const SEPAForm  = args.Form;
    let paymentInstrument = args.Basket.getPaymentInstruments('PG_SEPA');
    let customFormData = PaymentHelper.getFormData(SEPAForm, 'PG_SEPA');

    if (paymentInstrument.empty) {
        return;
    }

    Transaction.wrap(function () {
        Object.keys(customFormData).forEach(function(key) {
            paymentInstrument[0].custom[key] = customFormData[key];
        });
    });
}

exports.Handle = Handle;