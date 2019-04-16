'use strict';

var StringHelpers = {

    /**
     * URL parameters that need to be appended to URLs
     */
    urlParameters: {},

    /**
     * Appends pushed URL parameters to the given url
     * @param {string} url - url where to append parameters
     * @returns {string} url with appended parameter(s)
     */
    appendAdditionalRefinementParameters: function (url) {
        if (url) {
            for (var parameterID in this.urlParameters) { // eslint-disable-line no-restricted-syntax
                url.append(parameterID, this.urlParameters[parameterID]);
            }
        }
        return url;
    },

    /**
     * unsanitizeOR a string by replaced %7c with '|' pipes
     *
     * @param {string} anURL - URL String to sanitize
     * @returns {string} url with appended parameter(s)
     */
    unsanitizeOR: function (anURL, appendAdditionalRefinementParameters) {
        if (appendAdditionalRefinementParameters) {
            anURL = this.appendAdditionalRefinementParameters(anURL); // eslint-disable-line no-param-reassign
        }
        return anURL.toString().replace('%7c', '|', 'g');
    },

    /**
     * Helper function for parameter name transformation
     * @param {string} str - parameter name
     * @returns {string} parameter name in camel caps
     */
    camelize: function (str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
            return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
        }).replace(/(\s|-)+/g, '');
    },

    /**
     * Add padding to left side of string
     * @param {string} str - string where to add padding
     * @param {Number} minLength - desired string length
     * @param {string} fillChar - character to prepend
     * @returns {string} str
     */
    padLeft: function (str, minLength, fillChar) {
        var result = '';
        if (String(str).length < minLength) {
            while ((result.length + String(str).length) < minLength) {
                result += fillChar;
            }
        }
        return result + String(str);
    }
};

module.exports = StringHelpers;
