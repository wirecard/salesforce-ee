'use strict';

var pgLogger = require('dw/system/Logger').getLogger('paymentgateway', 'paymentgateway');

/**
 * Replace a text with stars * to a defined length
 * @param {string} value - sensitive value
 * @returns {string} - masked value
 */
function maskText(value) {
    var result = value.trim();
    var keepChars = 3; // can become variable at a later stage
    var regExp = new RegExp("^.*(?=.{" + keepChars + "}$)"); // eslint-disable-line
    var match = result.match(regExp);
    if (match.length === 1) {
        result = value.substr(0, match[0].length);
        for (var i = 0; i < (match[0].length - keepChars); i++) {
            result += '*';
        }
    }
    return result;
}

/**
 * @var {Object} fields - these fields have to be masked for logging
 * Example:
 *     - bic (form field name): callback function
 */
var fields = {
    bic: maskText
};
var fieldKeys = Object.keys(fields);

/**
 * Replace an object's property values if property names are within defined object "fields"
 * @param {Object} data - object with response / request data
 * @returns {Object} - with possibly masked values
 */
function maskFields(data) {
    var result = {};
    Object.keys(data).forEach(function (k) {
        var value = data[k];
        if (Object.prototype.toString.call(value) === '[object Array]') {
            result[k] = [];
            value.forEach(function (v) {
                result[k].push(maskFields(v));
            });
        } else if (value !== null && typeof value === 'object') {
            result[k] = maskFields(value);
        } else if (fieldKeys.indexOf(k) !== -1) {
            result[k] = fields[k].call(this, value);
        } else {
            result[k] = value;
        }
    });
    return result;
}

/**
 * Log request / response data to paymentgateway log.
 * @param {Object} data - request / response data
 * @param {string} dataType - defaults to "request"
 */
function log(data, dataType) {
    var Site = require('dw/system/Site').getCurrent();
    var isLoggingEnabled = Site.getCustomPreferenceValue('paymentGatewayDebugMode');
    if (isLoggingEnabled) {
        if (!dataType) {
            dataType = 'request';
        }
        var result = maskFields(data);

        var logMsg = dataType.toUpperCase() + ':'
            + '\n'
            + JSON.stringify(result, null, 2);
        pgLogger.info(logMsg);
    }
}

exports.log = log;
