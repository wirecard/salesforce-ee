'use strict';

/**
 * Checks if the current lineItemContainer contains digital products
 * @param {dw.order.LineItemContainer} lineItemContainer - The current user's basket / order
 * @returns {Object} an error object
 */
exports.hasDigitalProducts = function (lineItemContainer) {
    var result = false;
    var shipments = lineItemContainer.shipments;
    var iterator = shipments.iterator();
    while (iterator.hasNext()) {
        var shipment = iterator.next();
        if (shipment.giftCertificateLineItems.length > 0) {
            result = true;
            break;
        }
    }
    return result;
};
