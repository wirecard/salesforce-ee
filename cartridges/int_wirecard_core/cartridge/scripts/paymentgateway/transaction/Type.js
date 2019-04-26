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
    CREDIT: 'credit',
    DEBIT: 'debit',
    PENDING_CREDIT: 'pending-credit',
    REFUND: 'refund',
    REFUND_CAPTURE: 'refund-capture',
    REFUND_DEBIT: 'refund-debit',
    VOID_AUTHORIZATION: 'void-authorization',
    VOID_DEBIT: 'void-debit'
};

/**
 * List with follow transaction types
 * @var {Array}
 */
Type.Follow = [
    Type.All.CANCEL,
    Type.All.CAPTURE_AUTHORIZATION,
    Type.All.CREDIT,
    Type.All.PENDING_CREDIT,
    Type.All.REFUND,
    Type.All.REFUND_CAPTURE,
    Type.All.REFUND_DEBIT,
    Type.All.VOID_AUTHORIZATION
];

/**
 * List with types when a payment can be treated as cancelled
 * @var {Array}
 */
Type.Cancel = [
    Type.All.VOID_AUTHORIZATION
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
    Type.All.REFUND_CAPTURE,
    Type.All.REFUND_DEBIT
];

module.exports = Type;
