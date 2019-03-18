'use strict';

var StringHelpers = {

    /**
     * URL parameters that need to be appended to URLs
     */
    urlParameters : {},

    /**
     * Appends pushed URL parameters to the given url
     */
    appendAdditionalRefinementParameters: function ( url ){
        if (url) {
            for ( var parameterID in this.urlParameters ) {
                url.append(parameterID, this.urlParameters[parameterID])
            }
        }
        return url;
    },

    /**
     * unsanitizeOR a string by replaced %7c with '|' pipes
     *
     * @param anURL URL String to sanitize
     *
     **/
    unsanitizeOR: function(anURL, appendAdditionalRefinementParameters) {
        if (appendAdditionalRefinementParameters) {
            anURL = this.appendAdditionalRefinementParameters(anURL);
        }
        return anURL.toString().replace('%7c', '|', 'g');
    }
}

module.exports = StringHelpers;
