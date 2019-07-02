/**
 * Shop System Plugins:
 * - Terms of Use can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/_TERMS_OF_USE
 * - License can be found under:
 * https://github.com/wirecard/salesforce-ee/blob/master/LICENSE
 */
'use strict';

/* API includes */
var pgLogger = require('dw/system/Logger').getLogger('paymentgateway');

var Type = require('*/cartridge/scripts/paymentgateway/transaction/Type');

// transaction base path
var transactionBasePath = '*/cartridge/scripts/paymentgateway/transaction/';
// service class base path
var svcBasePath = '*/cartridge/scripts/paymentgateway/services/';


var TransactionHelper = {
    RESPONSE_TYPE_NOTIFY: 1,

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
            var requestedAmount = transaction.requestedAmount || { value: 0, currency: order.currencyCode };
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
     * @param {string} transactionType - as provided by payment gateway
     * @returns {Object}
     */
    getPaymentGatewayTransactionData: function (order, transactionId, transactionType) {
        var StringUtils = require('dw/util/StringUtils');

        var transactionData;
        var allTransactions = this.getPaymentGatewayTransactionDataFromOrder(order);
        var allTransactionsIterator = allTransactions.iterator();
        var canCancel = true;
        var refundedAmount = 0;

        while (allTransactionsIterator.hasNext()) {
            var tmpTransaction = allTransactionsIterator.next();
            if (tmpTransaction.transactionId == transactionId && tmpTransaction.transactionType == transactionType) {
                transactionData = tmpTransaction;
            } else if (tmpTransaction.parentTransactionId == transactionId
                && Type.Cancel.indexOf(tmpTransaction.transactionType) > -1
                && tmpTransaction.transactionState === 'success'
            ) {
                canCancel = false;
            } else if (tmpTransaction.parentTransactionId == transactionId
                && Type.Capture.indexOf(tmpTransaction.transactionType) > -1
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
        const mappedMethodNames = [
            'PG_IDEAL',
            'PG_POI',
            'PG_SOFORT',
            'PG_SEPA'
        ];
        if (-1 !== mappedMethodNames.indexOf(methodName) && transactionType === Type.All.CREDIT) {
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
     * @returns {void}
     */
    saveTransactionToOrder: function (order, newTransaction, overwrite) {
        if (newTransaction.transactionType === Type.All.CHECK_PAYER_RESPONSE) {
            return;
        }
        var ArrayList = require('dw/util/ArrayList');
        var Transaction = require('dw/system/Transaction');
        var paymentHelper = require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper');

        var allPaymentTransactions = new ArrayList();
        var savedTransactions = order.custom.paymentGatewayTransactions;
        var updatedTransaction = false;

        for (var i = 0; i < savedTransactions.length; i++) {
            var transaction = JSON.parse(savedTransactions[i]);

            if ((transaction.transactionId == newTransaction.transactionId)
                && (transaction.transactionType == newTransaction.transactionType)
            ) {
                if (overwrite) {
                    // replace backend transaction with notification response
                    allPaymentTransactions.push(JSON.stringify(newTransaction));
                    updatedTransaction = true;
                }
            } else if (!transaction.parentTransactionId
                && newTransaction.parentTransactionId == transaction.transactionId
//                && [paymentHelper.PAYMENT_METHOD_POI].indexOf(transaction.paymentMethodId) === -1
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
     *
     * @param {string} apiResponse - json response
     * @param {string} paymentMethodID - used payment method
     * @param {string} responseType
     * @returns {Object} - status with {code: ..., description: ... }
     */
    parseTransactionResponse: function (apiResponse, paymentMethodID, responseType) {
        var result       = {};
        var resultObject = {};

        try {
            if (responseType === this.RESPONSE_TYPE_NOTIFY) {
                const apiResponseWrapper = this.getJsonSignedResponseWrapper(apiResponse, paymentMethodID);

                if (!apiResponseWrapper.validateSignature()) {
                    throw new Error('Failed Signature validation');
                }

                resultObject = apiResponseWrapper.getJsonResponse();

                if ('error' in resultObject) {
                    throw new Error(resultObject['error']);
                }
            } else {
                resultObject = JSON.parse(apiResponse);
            }
        } catch (e) {
            pgLogger.error(e + '\n');
        }

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
            'merchant-bank-account',
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
     * @param {string} paymentMethodID
     * @returns {{validateSignature: (function(): boolean), getJsonResponse: (function(): object), jsonResponse: {payment: {}}, isValid: (function(): boolean), algorithmMapper: {"rsa-sha256": string}, validateFallbackHash: (function(): boolean)}}
     */
    getJsonSignedResponseWrapper: function(apiResponse, paymentMethodID) {

        if (this.getJsonSignedResponseWrapper.prototype.singleton) {
            return this.getJsonSignedResponseWrapper.prototype.singleton;
        }
        let responseObject = {
            jsonResponse: { payment: {} },
            paymentMethodID: paymentMethodID,
            algorithmFactory: {
                'HmacSHA256': function() {
                    const Mac = require('dw/crypto/Mac');

                    return new Mac(Mac.HMAC_SHA_256);
                }
            },
            getFirstPaymentMethodId: function() {
                const jsonResponse = this.getJsonResponse();

                //if payment methods are available then the other keys must exists
                if ('payment-methods' in jsonResponse['payment']) {
                    return jsonResponse['payment']['payment-methods']['payment-method'][0]['name'];
                }
                return '';
            },
            getSecret: function() {
                //if no payment method id was given we must use the first id
                if (!paymentMethodID) {
                    paymentMethodID = responseObject.getFirstPaymentMethodId();
                }
                return this.getSecretCustomPreferenceFromPaymentMethodId(paymentMethodID);
            }.bind(this),
            validateSignature: function() {
                if (!this.isValid()) {
                    throw new Error('invalid api response');
                }
                let factoryClass = this.algorithmFactory[this['response-signature-algorithm']];

                if ('function' !== typeof factoryClass) {
                    throw new Error('invalid response signature algorithm');
                }
                const Encoding = require('dw/crypto/Encoding');

                return Encoding.toBase64(factoryClass().digest(this['response-base64'], this.getSecret()))
                    === this['response-signature-base64'];
            },
            getJsonResponse: function() {
                if (!this.isValid() || this.jsonResponse.payment.length || 'error' in this.jsonResponse) {
                    return this.jsonResponse;
                }
                try {
                    this.jsonResponse = JSON.parse(require('dw/util/StringUtils').decodeBase64(this['response-base64']));
                } catch (jsonParseSyntaxError) {
                    this.jsonResponse['error'] = jsonParseSyntaxError;
                }
                return this.jsonResponse;
            },
            isValid: function() {
                return 'response-signature-base64' in this
                    && 'response-signature-algorithm' in this
                    && 'response-base64' in this
            }
        };

        apiResponse.split('&').forEach(function(keyValueString) {
            const [key] = keyValueString.split('=', 1);
            responseObject[key] = keyValueString.replace(key + '=', '');
        });
        this.getJsonSignedResponseWrapper.prototype.singleton = responseObject;

        return responseObject;
    },

    /**
     * Function for returning payment method secret
     * @param {string} paymentMethodId - current payment method
     * @returns {string} - payment method's secret
     */
    getSecretCustomPreferenceFromPaymentMethodId : function(paymentMethodId) {
        const Site = require('dw/system/Site').getCurrent();
        var paymentHelper = require('*/cartridge/scripts/paymentgateway/helper/PaymentHelper');
        var secret;

        switch (paymentMethodId) {
            case paymentHelper.PAYMENT_METHOD_SEPA_DIRECT_DEBIT:
                secret = Site.getCustomPreferenceValue('paymentGatewaySEPADebitSecret');
                break;
            case paymentHelper.PAYMENT_METHOD_CREDIT_CARD:
                secret = Site.getCustomPreferenceValue('paymentGatewayCreditCardSecret');
                break;
            case paymentHelper.PAYMENT_METHOD_CREDIT_CARD3DS:
                secret = Site.getCustomPreferenceValue('paymentGatewayCreditCardSecret3DS');
                break;
            case paymentHelper.PAYMENT_METHOD_EPS:
                secret = Site.getCustomPreferenceValue('paymentGatewayEpsSecret');
                break;
            case paymentHelper.PAYMENT_METHOD_GIROPAY:
                secret = Site.getCustomPreferenceValue('paymentGatewayGiropaySecret');
                break;
            case paymentHelper.PAYMENT_METHOD_IDEAL:
                secret = Site.getCustomPreferenceValue('paymentGatewayIdealSecret');
                break;
            case paymentHelper.PAYMENT_METHOD_PAYPAL:
                secret = Site.getCustomPreferenceValue('paymentGatewayPayPalSecret');
                break;
            case paymentHelper.PAYMENT_METHOD_POI:
                secret = Site.getCustomPreferenceValue('paymentGatewayPoiSecret');
                break;
            case paymentHelper.PAYMENT_METHOD_SEPA_CREDIT:
                secret = Site.getCustomPreferenceValue('paymentGatewaySEPACreditSecret');
                break;
            case paymentHelper.PAYMENT_METHOD_SOFORT:
                secret = Site.getCustomPreferenceValue('paymentGatewaySofortSecret');
                break;
            default: throw new Error('No Secret for payment method ID');
        }
        return secret;
    }
};

module.exports = TransactionHelper;
