/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

function Type() {}

/**
 * Definition of transaction types
 * @var {Object}
 */
Type.All = {
    AUTHORIZATION: 'authorization',
    AUTHORIZATION_ONLY: 'authorization-only',
    CANCEL: 'cancel',
    CAPTURE_AUTHORIZATION: 'capture-authorization',
    CHECK_ENROLLMENT: 'check-enrollment',
    CHECK_PAYER_RESPONSE: 'check-payer-response',
    CREDIT: 'credit',
    DEBIT: 'debit',
    DEPOSIT: 'deposit',
    PENDING_CREDIT: 'pending-credit',
    PENDING_DEBIT: 'pending-debit',
    PURCHASE: 'purchase',
    REFUND: 'refund',
    REFUND_CAPTURE: 'refund-capture',
    REFUND_DEBIT: 'refund-debit',
    REFUND_PURCHASE: 'refund-purchase',
    VOID_AUTHORIZATION: 'void-authorization',
    VOID_CAPTURE: 'void-capture',
    VOID_DEBIT: 'void-debit',
    VOID_PENDING_DEBIT: 'void-pending-debit',
    VOID_PURCHASE: 'void-purchase'
};

/**
 * List with follow transaction types
 * @var {Array}
 */
Type.Follow = [
    Type.All.CANCEL,
    Type.All.CAPTURE_AUTHORIZATION,
    Type.All.CREDIT,
    Type.All.DEPOSIT,
    Type.All.PENDING_CREDIT,
    Type.All.REFUND,
    Type.All.REFUND_CAPTURE,
    Type.All.REFUND_DEBIT,
    Type.All.REFUND_PURCHASE,
    Type.All.VOID_AUTHORIZATION,
    Type.All.VOID_CAPTURE,
    Type.All.VOID_PURCHASE
];

/**
 * List with types when a payment can be treated as cancelled
 * @var {Array}
 */
Type.Cancel = [
    Type.All.VOID_AUTHORIZATION,
    Type.All.VOID_PENDING_DEBIT
];

/**
 * List with types when a payment can be treated as paid
 * @var {Array}
 */
Type.Capture = [
    Type.All.CAPTURE_AUTHORIZATION,
    Type.All.DEBIT
];

/**
 * List with refund types
 * @var {Array}
 */
Type.Refund = [
    Type.All.CREDIT,
    Type.All.PENDING_CREDIT,
    Type.All.REFUND,
    Type.All.REFUND_CAPTURE,
    Type.All.REFUND_DEBIT,
    Type.All.REFUND_PURCHASE,
    Type.All.VOID_CAPTURE,
    Type.All.VOID_PURCHASE
];

/**
 * Object with type pairs that succeed each other
 * @var {Object}
 */
Type.FollowMapping = function () {
    var mapping = [];
    mapping[Type.All.VOID_CAPTURE] = Type.All.REFUND_CAPTURE;
    mapping[Type.All.VOID_PURCHASE] = Type.All.REFUND_PURCHASE;
    return mapping;
};

module.exports = Type;
