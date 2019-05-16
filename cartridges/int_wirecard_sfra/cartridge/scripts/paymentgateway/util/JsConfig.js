'use strict';

/**
 * Retrieve config values as json for frontend js
 * @returns {string} - config json
 */
exports.getConfig = function () {
    var URLUtils = require('dw/web/URLUtils');

    var config = {
        getRequestDataUrl: URLUtils.https('PaymentGatewayCredit-RequestData').toString(),
        restoreBasketUrl: URLUtils.https('PaymentGatewayCredit-RestoreBasket').toString()
    };

    return JSON.stringify(config);
};
