/* eslint-disable no-param-reassign */
'use strict';

var StringHelpers = {

    /**
     * URL parameters that need to be appended to URLs
     */
    urlParameters: {},

    /**
     * Appends pushed URL parameters to the given url
     * @param {string} url - url where to add refined parameters
     * @returns {string} - sanitized url
     */
    appendAdditionalRefinementParameters: function (url) {
        if (url) {
            for (var parameterID in this.urlParameters) { // eslint-disable-line
                url.append(parameterID, this.urlParameters[parameterID]);
            }
        }
        return url;
    },

    /**
     * unsanitizeOR a string by replaced %7c with '|' pipes
     * @param {string} anURL - URL String to sanitize
     * @param {boolean} appendAdditionalRefinementParameters - flag whether to append refined params
     * @returns {string} url with sanitized parameters
     */
    unsanitizeOR: function (anURL, appendAdditionalRefinementParameters) {
        if (appendAdditionalRefinementParameters) {
            anURL = this.appendAdditionalRefinementParameters(anURL);
        }
        return anURL.toString().replace('%7c', '|', 'g');
    }
};

module.exports = StringHelpers;
