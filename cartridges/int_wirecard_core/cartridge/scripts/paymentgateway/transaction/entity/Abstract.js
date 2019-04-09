'use strict';

var Site = require('dw/system/Site').getCurrent();

function AbstractEntity() {}

/**
 * Helper function to retrieve specific config value
 * @param {string} key - site preference name
 * @returns {string}
 */
AbstractEntity.prototype.getSitePreference = function (key) {
    var result = Site.getCustomPreferenceValue(key);
    if (!result) {
        result = '';
    }
    return result;
};

module.exports = AbstractEntity;
