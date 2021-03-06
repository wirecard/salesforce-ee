/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

var EppResponse = {
    /**
     * Parse base64 encoded response - extracts status message
     * @param {string} data - base64 encoded xml message
     * @param {string} generalErrorMsg - error message to display as fallback
     * @returns {Object} - with error code & message
     */
    parseBase64: function (data, generalErrorMsg) {
        var xmlMessage = require('dw/util/StringUtils').decodeBase64(data);
        return this.parseXML(xmlMessage, generalErrorMsg);
    },

    /**
     * Parse xml response - extracts status message
     * @param {string} xmlMessage - xml message
     * @param {string} generalErrorMsg - error message to display as fallback
     * @returns {Object} - with error code & message
     */
    parseXML: function (xmlMessage, generalErrorMsg) {
        var result = {};

        try {
            var XMLStreamConstants = require('dw/io/XMLStreamConstants');
            var reader = new (require('dw/io/Reader'))(xmlMessage);
            var xmlStream = new (require('dw/io/XMLStreamReader'))(reader);
            var xmlObj;

            while (xmlStream.hasNext()) {
                if (xmlStream.next() == XMLStreamConstants.START_ELEMENT) {
                    if (xmlStream.getLocalName() == 'transaction-state') {
                        xmlObj = xmlStream.readXMLObject();
                        result.transactionState = xmlObj.toString();
                    } else if (xmlStream.getLocalName() == 'status') {
                        // use 1st status only
                        if (!(Object.prototype.hasOwnProperty.call(result, 'status'))) {
                            xmlObj = xmlStream.readXMLObject();
                            result.status = {
                                severity: xmlObj.attribute('severity').toString(),
                                message: xmlObj.attribute('description').toString(),
                                code: xmlObj.attribute('code').toString()
                            };
                        }
                    }
                }
            }
            xmlStream.close();
            reader.close();

            if (!(Object.prototype.hasOwnProperty.call(result, 'status'))
                || !(Object.prototype.hasOwnProperty.call(result.status, 'message'))
            ) {
                throw new Error('No status provided by response!');
            }
        } catch (err) {
            result.status = {
                code: '999.999',
                severity: 'error',
                message: generalErrorMsg || err.message
            };
        }

        return result;
    }
};

module.exports = EppResponse;
