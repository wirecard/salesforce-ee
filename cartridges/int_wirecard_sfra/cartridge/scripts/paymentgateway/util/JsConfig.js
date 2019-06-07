/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/**
 * Retrieve config values as json for frontend js
 * @returns {string} - config json
 */
exports.getConfig = function () {
    var URLUtils = require('dw/web/URLUtils');

    var config = {
        getRequestDataUrl: URLUtils.https('PaymentGatewayCredit-RequestData').toString()
    };

    return JSON.stringify(config);
};
