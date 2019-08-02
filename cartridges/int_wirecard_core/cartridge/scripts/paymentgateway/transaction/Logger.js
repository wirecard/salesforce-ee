'use strict';

var pgLogger = require('dw/system/Logger').getLogger('paymentgateway', 'paymentgateway');

/**
 * Replace a text with stars * to a defined length
 * @param {string} value - sensitive value
 * @returns {string} - masked value
 */
function maskText(value) {
    var result = value.trim();
    var keepChars = Math.min(Math.floor(result.length / 2), 10);
    var regExp = new RegExp("^.*(?=.{" + keepChars + "}$)"); // eslint-disable-line
    var match = result.match(regExp);
    if (match.length === 1) {
        var remainder = result.length - match[0].length;
        result = result.substr(0, match[0].length);
        for (var i = 0; i < remainder; i++) {
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
    'account-number': maskText,
    'bank-code': maskText,
    bic: maskText,
    iban: maskText
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
 * Create log message for service communication log
 * @param {Object} data - request / response data object
 * @returns {string} - stringified json
 */
function createLogMessage(data) {
    var result = maskFields(data);
    return JSON.stringify(result, null, 2);
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
        var StringUtils = require('dw/util/StringUtils');
        var logMsg = StringUtils.format('{0}: \n {1}', dataType.toUpperCase(), createLogMessage(data));
        pgLogger.info(logMsg);
    }
}

exports.createLogMessage = createLogMessage;
exports.log = log;
