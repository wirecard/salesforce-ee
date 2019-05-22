'use strict';

/* API includes */
var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');

var Type = require('*/cartridge/scripts/paymentgateway/transaction/Type');

// transaction base path
var transactionBasePath = '*/cartridge/scripts/paymentgateway/transaction/';
// service class base path
var svcBasePath = '*/cartridge/scripts/paymentgateway/services/';

var TransactionHelper = {
    /**
     * Retrieve payment gateway transaction data from dw.order.Order
     * @param {dw.order.Order}
     * @returns {Object}
     */
    getPaymentGatewayTransactionDataFromOrder: function (order) {
        var ArrayList = require('dw/util/ArrayList');
        var transactionData = new ArrayList();
        var orderHelper = require('*/cartridge/scripts/paymentgateway/helper/OrderHelper');
        var paymentData = orderHelper.getPaymentGatewayOrderPayment(order);

        var Money = require('dw/value/Money');

        for (var i = 0; i < order.custom.paymentGatewayTransactions.length; i++) {
            var transaction = JSON.parse(order.custom.paymentGatewayTransactions[i]);
            var createdAt = new Date(transaction.completionTimeStamp);
            var requestedAmount = transaction.requestedAmount;
            var capturedAmount = order.custom.paymentGatewayCapturedAmount || 0;
            var refundedAmount = order.custom.paymentGatewayRefundedAmount || 0;

            transactionData.push({
                transactionId: transaction.transactionId,
                parentTransactionId: transaction.parentTransactionId,
                transactionState: transaction.transactionState,
                transactionType: transaction.transactionType,
                merchantAccountId: transaction.merchantAccountId,
                paymentMethodID: paymentData.paymentMethodID,
                amount: new Money(requestedAmount.value, requestedAmount.currency),
                capturedAmount: new Money(capturedAmount, requestedAmount.currency),
                refundedAmount: new Money(refundedAmount, requestedAmount.currency),
                createdAt: createdAt
            });
        }

        return transactionData;
    },

    /**
     * Retrieve data for a single transaction
     * @param {dw.order.Order} - related order
     * @param {string} transactionId - as provided by payment gateway
     * @returns {Object}
     */
    getPaymentGatewayTransactionData: function (order, transactionId) {
        var StringUtils = require('dw/util/StringUtils');

        var transactionData;
        var allTransactions = this.getPaymentGatewayTransactionDataFromOrder(order);
        var allTransactionsIterator = allTransactions.iterator();
        var canCancel = true;
        var refundedAmount = 0;

        while (allTransactionsIterator.hasNext()) {
            var tmpTransaction = allTransactionsIterator.next();
            if (tmpTransaction.transactionId == transactionId) {
                transactionData = tmpTransaction;
            } else if (tmpTransaction.parentTransactionId == transactionId
                && Type.Cancel.indexOf(tmpTransaction.transactionType) > -1
                && tmpTransaction.transactionState === 'success'
            ) {
                canCancel = false;
            } else if (tmpTransaction.parentTransactionId == transactionId
                && Type.Refund.indexOf(tmpTransaction.transactionType) > -1
                && tmpTransaction.transactionState === 'success'
            ) {
                refundedAmount += tmpTransaction.amount.value;
            }
        }
        if (!transactionData) {
            throw new Error(
                StringUtils.format('No transaction found with {0} for orderNo {1}', transactionId, order.orderNo)
            );
        }

        var transaction = this.getTransaction(
            transactionData.paymentMethodID,
            order,
            {
                'requested-amount': transactionData.amount.value,
                'transaction-type': transactionData.transactionType,
                'refunded-amount': refundedAmount
            }
        );
        transactionData.allowedOperations = transaction.getBackendOperations(canCancel);
        var partialAllowedOperations = [];
        transactionData.allowedOperations.forEach(function (item) {
            if (Object.prototype.hasOwnProperty.call(item, 'partialAllowed')) {
                partialAllowedOperations.push(item.action);
            }
        });
        transactionData.partialAllowedOperations = partialAllowedOperations;
        return transactionData;
    },

    /**
     * Try to get transaction instance for given method
     * @param {string} methodName - current payment method name
     * @param {dw.order.Order} order - order placed with payment method
     * @returns {null|Object} - instance of transaction class or null if nothing found
     */
    getTransaction: function (methodName, order) {
        var transaction = null;
        // fetch optional arguments
        /*
         * Object with properties - e.g.
         * { parentTransactionId: 1223 }
         */
        var args = Array.prototype.slice.call(arguments, 2);
        var params = {};
        if (args.length > 0 && typeof args[0] === 'object') {
            params = args[0];
        }

        var path = transactionBasePath + methodName;
        try {
            transaction = new (require(path))(order, params);
        } catch (err) {
            pgLogger.error('No transaction class found for : ' + methodName + ', in: ' + path + '\n'
                + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        return transaction;
    },

    /**
     * Try to get service class for given method
     * @param {string} methodName - current payment method name
     * @param {string} type - either "payments" or "paymentmethods"
     * @returns {Object} - instance of service class
     */
    getPaymentService: function (methodName, type) {
        var svcClass = null;
        var path = svcBasePath + methodName;

        try {
            svcClass = require(path)(type);
        } catch (err) {
            pgLogger.error('No service class found for : ' + methodName + ', in: ' + path + '\n'
                + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        return svcClass;
    },

    /**
     * Map transaction types for certain payment methods
     * @param {string} methodName - current payment method name
     * @param {string} transactionType - one of Type.All
     * @returns {Object} - contains mapped method name and part of api endpoint payments|paymentmethods
     */
    mapTransactionType: function (methodName, transactionType) {
        var result = {
            type: 'payments',
            methodName: methodName
        };
        if (methodName === 'PG_SOFORT' && transactionType === Type.All.CREDIT) {
            var preferenceHelper = require('*/cartridge/scripts/paymentgateway/PreferencesHelper');
            var sepaPreferences = preferenceHelper.getPreferenceForMethodID('PG_SEPACREDIT');
            result = {
                type: 'paymentmethods',
                methodName: 'PG_SEPACREDIT',
                merchantAccountId: sepaPreferences.merchantAccountID
            };
        }
        return result;
    },

    /**
     * Parse transaction status from http response object
     * @param {string} apiErrorText - http client error text
     * @returns {Object} - status with { code: ..., description: ... }
     */
    parseTransactionStatus: function (apiErrorText) {
        // FIXME return general error?
        var result = { code: '999.999999', description: 'General technical error' };
        var dataObject = JSON.parse(apiErrorText);
        if (Object.prototype.hasOwnProperty.call(dataObject, 'payment')
            && Object.prototype.hasOwnProperty.call(dataObject.payment, 'statuses')
            && Object.prototype.hasOwnProperty.call(dataObject.payment.statuses, 'status')
            && dataObject.payment.statuses.status.length > 0
        ) {
            result = dataObject.payment.statuses.status[0];
        }
        return result;
    },

    /**
     * Save transaction with order
     * @param {dw.order.Order} order - related order
     * @param {Object} newTransaction - transaction data
     * @param {boolean} overwrite - if true replaces preceding initial transaction
     */
    saveTransactionToOrder: function (order, newTransaction, overwrite) {
        var ArrayList = require('dw/util/ArrayList');
        var Transaction = require('dw/system/Transaction');

        var allPaymentTransactions = new ArrayList();
        var savedTransactions = order.custom.paymentGatewayTransactions;
        var updatedTransaction = false;

        for (var i = 0; i < savedTransactions.length; i++) {
            var transaction = JSON.parse(savedTransactions[i]);

            if (transaction.transactionId == newTransaction.transactionId) {
                if (overwrite) {
                    // replace backend transaction with notification response
                    allPaymentTransactions.push(JSON.stringify(newTransaction));
                    updatedTransaction = true;
                }
            } else if (!transaction.parentTransactionId
                && newTransaction.parentTransactionId == transaction.transactionId
            ) {
                // replace initial transaction with notification response
                allPaymentTransactions.push(JSON.stringify(newTransaction));
                updatedTransaction = true;
            } else {
                // keep all other transactions
                allPaymentTransactions.push(JSON.stringify(transaction));
            }
        }
        // if no transaction was updated then add the newTransaction
        if (!updatedTransaction) {
            allPaymentTransactions.push(JSON.stringify(newTransaction));
        }
        Transaction.wrap(function () {
            order.custom.paymentGatewayTransactions = allPaymentTransactions;
        });
    },

    /**
     * Save credit card (seamless) transaction with order
     * @param {dw.order.Order} order - related order
     * @param {Object} transactionData - transaction data as json object
     */
    saveSeamlessTransactionToOrder: function (order, transactionData) {
        this.saveTransactionToOrder(order, this.parseSeamlessTransactionData(transactionData));
    },

    /**
     * Save capture / refund amount
     * @param {dw.order.Order} order - current order
     * @param {Object} transaction - transaction data
     * @param {boolean} overwrite - if true replaces preceding initial transaction
     */
    saveBackendTransaction: function (order, transaction, overwrite) {
        var Money = require('dw/value/Money');
        var Transaction = require('dw/system/Transaction');
        var result;

        if (transaction.transactionState === 'success') {
            if (Type.Capture.indexOf(transaction.transactionType) > -1) {
                var alreadyCaptured = new Money(order.custom.paymentGatewayCapturedAmount || 0, order.currencyCode);
                result = alreadyCaptured.add(new Money(transaction.requestedAmount.value, order.currencyCode));
                Transaction.wrap(function () {
                    order.custom.paymentGatewayCapturedAmount = result.value;
                });
            }
            if (Type.Refund.indexOf(transaction.transactionType) > -1) {
                var alreadyRefunded = new Money(order.custom.paymentGatewayRefundedAmount || 0, order.currencyCode);
                result = alreadyRefunded.add(new Money(transaction.requestedAmount.value, order.currencyCode));
                Transaction.wrap(function () {
                    order.custom.paymentGatewayRefundedAmount = result.value;
                });
            }
            if (transaction.transactionType != Type.All.CHECK_PAYER_RESPONSE) {
                var orderState = require('~/cartridge/scripts/paymentgateway/helper/OrderHelper').getPaymentGatewayOrderStateFromTransactionType(order, transaction);
                Transaction.wrap(function () {
                    order.custom.paymentGatewayOrderState = orderState;
                });
            }
        }
        // finally save transaction with order
        this.saveTransactionToOrder(order, transaction, overwrite);
    },

    /**
     * Parse transaction data from seamless integration
     * @param {Object} transactionData - json object
     * @returns {Object} - status with {code: ..., description: ... }
     */
    parseSeamlessTransactionData: function (transactionData) {
        var result = {};
        var stringHelper = require('*/cartridge/scripts/paymentgateway/util/StringHelper');
        var tmp;

        [
            'status_code_1',
            'request_id',
            'merchant_account_id',
            'transaction_type',
            'transaction_state',
            'transaction_id',
            'completion_time_stamp',
            'requested_amount',
            'payment_method',
            'parent_transaction_id',
            'custom_fields'
        ].forEach(function (key) {
            var resultKey = stringHelper.camelize(key.replace(/_/g, '-'));
            if (Object.prototype.hasOwnProperty.call(transactionData, key)) {
                if (key === 'status_code_1') {
                    if (Object.prototype.hasOwnProperty.call(transactionData, 'status_description_1')
                        && Object.prototype.hasOwnProperty.call(transactionData, 'status_severity_1')
                    ) {
                        result.status = {
                            code: transactionData.status_code_1,
                            description: transactionData.status_description_1,
                            severity: transactionData.status_severity_1
                        };
                    }
                } else if (key === 'completion_time_stamp') {
                    tmp = transactionData[key].match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
                    var date = new Date();
                    if (tmp.length === 7) {
                        date.setFullYear(tmp[1]);
                        date.setMonth(parseInt(tmp[2], 10) - 1);
                        date.setDate(tmp[3]);
                        date.setHours(tmp[4]);
                        date.setMinutes(tmp[5]);
                        date.setSeconds(tmp[6]);
                    }
                    result[resultKey] = date.getTime();
                } else if (key === 'requested_amount') {
                    result[resultKey] = {
                        value: transactionData[key],
                        currency: transactionData.requested_amount_currency
                    };
                } else {
                    result[resultKey] = transactionData[key];
                }
            }
        });
        return result;
    },

    /**
     * Parse api response from http service call
     * @param {string} apiResponse - json response
     * @returns {Object} - status with {code: ..., description: ... }
     */
    parseTransactionResponse: function (apiResponse, paymentMethodID) {
        var result       = {};
        var resultObject = {};

        try {
            if (require('dw/system/Site').getCurrent().getCustomPreferenceValue('paymentGatewaySignResponses')) {
                const apiResponseWrapper = this.getJsonSignedResponseWrapper(apiResponse);

                if (!apiResponseWrapper.isValid()) {
                    throw 'Invalid api response';
                }
                if (!apiResponseWrapper.validateSignature() && !apiResponseWrapper.validateFallbackHash()) {
                    throw 'Failed Signature validation';
                }

                resultObject = apiResponseWrapper.getJsonResponse();

                if ('error' in resultObject) {
                    throw resultObject['error'];
                }
            } else {
                resultObject = JSON.parse(apiResponse);
            }
        } catch (e) {}

        var stringHelper = require('*/cartridge/scripts/paymentgateway/util/StringHelper');
        var tmp;

        [
            'statuses',
            'request-id',
            'merchant-account-id',
            'transaction-type',
            'transaction-state',
            'transaction-id',
            'completion-time-stamp',
            'requested-amount',
            'payment-methods',
            'parent-transaction-id',
            'custom-fields'
        ].forEach(function (key) {
            var resultKey = stringHelper.camelize(key);
            if (Object.prototype.hasOwnProperty.call(resultObject.payment, key)) {
                if (key === 'merchant-account-id') {
                    result[resultKey] = resultObject.payment[key].value;
                } else if (key === 'payment-methods'
                    && resultObject.payment[key]['payment-method']
                    && resultObject.payment[key]['payment-method'].length > 0
                ) {
                    tmp = resultObject.payment[key]['payment-method'].filter(function (m) { // eslint-disable-line array-callback-return
                        if (m.name == paymentMethodID) return m;
                    });
                    if (tmp.length > 0) {
                        ['name', 'url'].forEach(function (k) {
                            if (Object.prototype.hasOwnProperty.call(tmp[0], k)) {
                                var tmpKey = k === 'url' ? 'redirectURL' : 'paymentMethodId';
                                result[tmpKey] = tmp[0][k];
                            }
                        });
                    }
                } else if (key === 'statuses'
                    && resultObject.payment[key].status
                    && resultObject.payment[key].status.length > 0
                ) {
                    // FIXME ok to grab only first status?
                    tmp = resultObject.payment[key].status[0];
                    result.status = tmp;
                } else if (key === 'custom-fields' && Object.prototype.hasOwnProperty.call(resultObject.payment[key], 'custom-field')) {
                    tmp = resultObject.payment[key]['custom-field'];
                    var cName;
                    result[resultKey] = {};
                    tmp.forEach(function (cField) {
                        cName = cField['field-name'];
                        result[resultKey][cName] = cField['field-value'];
                    });
                } else {
                    result[resultKey] = resultObject.payment[key];
                }
            }
        });
        return result;
    },

    /**
     *
     * @todo maybe its better in a own file
     *
     * @param {string} apiResponse
     * @returns {{validateSignature: (function(): boolean), getJsonResponse: (function(): object), jsonResponse: {payment: {}}, isValid: (function(): boolean), algorithmMapper: {"rsa-sha256": string}, validateFallbackHash: (function(): boolean)}}
     */
    getJsonSignedResponseWrapper: function(apiResponse) {
        let responseObject = {
            jsonResponse: { payment: {} },
            algorithmMapper: {
                'rsa-sha256': 'SHA256withRSA'
            },
            validateSignature: function() {
                if (!this.isValid()) {
                    return false;
                }
                const SignatureAlgorithm = this.algorithmMapper[this['response-signature-algorithm']];
                const Signature          = new (require('dw/crypto/Signature'))();

                if (!Signature.isDigestAlgorithmSupported(SignatureAlgorithm)) {
                    return false;
                }
                const CertificateRef = require('dw/crypto/CertificateRef');
                const Site           = require('dw/system/Site').getCurrent();
                const Certificate    = new CertificateRef(Site.getCustomPreferenceValue('paymentGatewayCertAlias'));

                return Signature.verifySignature(
                    this['response-signature-base64'],
                    this['responsebase64'],
                    Certificate,
                    SignatureAlgorithm
                );
            },
            validateFallbackHash: function() {
                const jsonResponse = this.getJsonResponse();

                if (!'custom-fields' in jsonResponse.payment) {
                    return false;
                }
                const Site = require('dw/system/Site').getCurrent();

                //@fixme use a constant for paymentGatewayUrlSalt
                const customField = jsonResponse.payment['custom-fields'].filter(function(customField) {
                    return 'paymentGatewayUrlSalt' in customField['custom-field'];
                }).shift();

                return Site.getCustomPreferenceValue('paymentGatewayUrlSalt')
                    === customField['custom-field']['paymentGatewayUrlSalt'];
            },
            getJsonResponse: function() {
                if (!this.isValid() || this.jsonResponse.payment.length || 'error' in this.jsonResponse) {
                    return this.jsonResponse;
                }
                try {
                    this.jsonResponse = JSON.parse(require('dw/util/StringUtils').decodeBase64(this['responsebase64']));
                } catch (jsonParseSyntaxError) {
                    this.jsonResponse['error'] = jsonParseSyntaxError;
                }
                return this.jsonResponse;
            },
            isValid: function() {
                return 'response-signature-base64' in this
                    && 'response-signature-algorithm' in this
                    && 'responsebase64' in this
            }
        };

        apiResponse.split('&').forEach(function(keyValueString) {
            let [key, value] = keyValueString.split('=', 1);
            this[key] = value;
        }, responseObject);

        return responseObject;
    }
};

module.exports = TransactionHelper;
